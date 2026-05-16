import { useState, useEffect, useMemo, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CentralIcon } from "@central-icons-react/all";
import { Streamdown, defaultRemarkPlugins } from "streamdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import ibSubjectsRaw from "@/data/ib-subjects.json";
import { centralIconPropsOutlined28, centralIconPropsFilled24, centralIconPropsFilled20 } from "@/lib/icon-props";
import "katex/dist/katex.min.css";

export const Route = createFileRoute("/exam")({
  component: ExamPage,
});

type IbSubject = { slug: string; title: string; coverImageUrl: string; group: number | "core" };

type QuestionPart = {
  id: number;
  content: string;
  order: number;
  marks: number;
  markscheme?: string | null;
};
type QuestionOption = {
  id: number;
  content: string;
  correct: boolean;
  order: number;
};
type Question = {
  id: string;
  specification: string;
  questionType: string | null;
  level: string;
  paper: string;
  questionSet?: string;
  parts: QuestionPart[];
  options: QuestionOption[];
  markscheme?: string | null;
};

type TopicEntry = { slug: string; title: string };

const REMARK_PLUGINS = [...Object.values(defaultRemarkPlugins), remarkMath];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getCompletedForSubject(subjectSlug: string, topicSlugs: string[]): Set<string> {
  const completed = new Set<string>();
  for (const slug of topicSlugs) {
    try {
      const stored = localStorage.getItem(`qb_completed_${subjectSlug}_${slug}`);
      if (stored) (JSON.parse(stored) as string[]).forEach((id) => completed.add(id));
    } catch {}
  }
  return completed;
}

function paperLabel(paper: string): string {
  const map: Record<string, string> = { "ib-1": "Paper 1", "ib-2": "Paper 2", "ib-3": "Paper 3", "ib-1a": "Paper 1A", "ib-1b": "Paper 1B", "ib-unknown": "Unknown" };
  return map[paper] ?? paper;
}
function levelLabel(level: string): string {
  if (level === "hl") return "HL";
  if (level === "sl") return "SL";
  if (level === "both") return "Both";
  return level;
}

// ─── Configure phase ─────────────────────────────────────────────────────────

function ExamPage() {
  const ibSubjects = ibSubjectsRaw as IbSubject[];

  // Subjects that actually have questions
  const [subjectsWithQb, setSubjectsWithQb] = useState<Set<string> | null>(null);

  useEffect(() => {
    void Promise.resolve(
      supabase.from("subjects").select("slug").eq("enable_questions", true)
    ).then(({ data }) => setSubjectsWithQb(new Set((data ?? []).map((r: any) => r.slug))))
      .catch(() => setSubjectsWithQb(new Set()));
  }, []);

  const availableSubjects = useMemo(
    () => (subjectsWithQb ? ibSubjects.filter((s) => subjectsWithQb.has(s.slug)) : []),
    [ibSubjects, subjectsWithQb]
  );

  // Config state
  const [subjectSlug, setSubjectSlug] = useState("");
  const [topics, setTopics] = useState<TopicEntry[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [numQuestions, setNumQuestions] = useState(10);
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [levelFilter, setLevelFilter] = useState("all");
  const [generating, setGenerating] = useState(false);

  // Exam state
  const [examQuestions, setExamQuestions] = useState<Question[] | null>(null);
  const [examSubjectSlug, setExamSubjectSlug] = useState("");
  const [answersShown, setAnswersShown] = useState<Set<string>>(new Set());
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [examDone, setExamDone] = useState<Set<string>>(new Set());

  // Load topics when subject changes
  useEffect(() => {
    if (!subjectSlug) { setTopics([]); setSelectedTopics(new Set()); return; }
    setLoadingTopics(true);
    setSelectedTopics(new Set());
    Promise.all([
      supabase.from("subjects").select("data").eq("slug", subjectSlug).single(),
      supabase.from("questions").select("topic_slug").eq("subject_slug", subjectSlug),
    ]).then(([{ data: subRow }, { data: qRows }]) => {
      const detail = subRow?.data as { topics?: { slug: string; title: string; childTopics?: { slug: string; title: string }[] }[] } | null;
      const qbSlugs = new Set((qRows ?? []).map((r: any) => r.topic_slug).filter(Boolean));
      const flat: TopicEntry[] = [];
      for (const t of detail?.topics ?? []) {
        if (t.childTopics?.length) {
          t.childTopics.filter((c) => qbSlugs.has(c.slug)).forEach((c) => flat.push({ slug: c.slug, title: c.title }));
        } else if (qbSlugs.has(t.slug)) {
          flat.push({ slug: t.slug, title: t.title });
        }
      }
      setTopics(flat);
      setSelectedTopics(new Set(flat.map((t) => t.slug)));
      setLoadingTopics(false);
    }).catch(() => { setTopics([]); setLoadingTopics(false); });
  }, [subjectSlug]);

  function toggleTopic(slug: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const generate = useCallback(async () => {
    if (!subjectSlug || selectedTopics.size === 0) return;
    setGenerating(true);
    try {
      const topicList = [...selectedTopics];
      const { data: rows } = await supabase
        .from("questions")
        .select("data")
        .eq("subject_slug", subjectSlug)
        .in("topic_slug", topicList);

      let questions: Question[] = (rows ?? [])
        .map((r) => r.data as Question)
        .filter((q) => q.questionSet !== "TEACHER");

      // Level filter
      if (levelFilter !== "all") {
        questions = questions.filter((q) => q.level === levelFilter || q.level === "both");
      }

      // Completed filter
      if (!includeCompleted) {
        const completedIds = getCompletedForSubject(subjectSlug, topicList);
        questions = questions.filter((q) => !completedIds.has(q.id));
      }

      const picked = shuffle(questions).slice(0, numQuestions);
      setExamQuestions(picked);
      setExamSubjectSlug(subjectSlug);
      setAnswersShown(new Set());
      setShowAllAnswers(false);
      setExamDone(new Set());
    } finally {
      setGenerating(false);
    }
  }, [subjectSlug, selectedTopics, numQuestions, includeCompleted, levelFilter]);

  // ── Exam phase ──
  if (examQuestions !== null) {
    return (
      <ExamView
        questions={examQuestions}
        subjectSlug={examSubjectSlug}
        subjectTitle={availableSubjects.find((s) => s.slug === examSubjectSlug)?.title ?? ""}
        answersShown={answersShown}
        showAllAnswers={showAllAnswers}
        examDone={examDone}
        onToggleAnswer={(id) =>
          setAnswersShown((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })
        }
        onToggleDone={(id) =>
          setExamDone((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })
        }
        onRevealAll={() => { setShowAllAnswers(true); setAnswersShown(new Set(examQuestions.map((q) => q.id))); }}
        onNewExam={() => setExamQuestions(null)}
        onRegenerate={generate}
      />
    );
  }

  // ── Configure phase ──
  const canGenerate = subjectSlug && selectedTopics.size > 0 && !loadingTopics;

  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pt-12">
      {/* Header */}
      <div className="flex flex-row items-center gap-4">
        <span className="rounded-2xl bg-orange-100 p-2 text-orange-700 dark:bg-orange-400/25 dark:text-orange-300">
          <CentralIcon {...centralIconPropsOutlined28} name="IconPencilSparkle" className="size-8" />
        </span>
        <h1 className="font-manrope text-4xl font-bold tracking-tight text-foreground">
          Exam Generator
        </h1>
      </div>

      {subjectsWithQb === null ? (
        <p className="text-muted-foreground">Loading subjects…</p>
      ) : (
        <div className="space-y-8">

          {/* Subject */}
          <section className="space-y-3">
            <h2 className="font-manrope text-xl font-bold tracking-tight text-foreground">Subject</h2>
            <div className="flex flex-wrap gap-2">
              {availableSubjects.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setSubjectSlug(s.slug)}
                  className={cn(
                    "rounded-xl border-2 px-3 py-1.5 text-sm font-medium transition-colors",
                    subjectSlug === s.slug
                      ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:border-orange-400 dark:text-orange-400"
                      : "border-border text-foreground hover:border-orange-400 hover:bg-orange-50 dark:hover:border-orange-500 dark:hover:bg-orange-400/10"
                  )}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </section>

          {/* Topics */}
          {subjectSlug && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-manrope text-xl font-bold tracking-tight text-foreground">Topics</h2>
                {topics.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTopics(new Set(topics.map((t) => t.slug)))}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Select all
                    </button>
                    <span className="text-muted-foreground/40">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTopics(new Set())}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              {loadingTopics ? (
                <p className="text-sm text-muted-foreground">Loading topics…</p>
              ) : topics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No topics available for this subject.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => toggleTopic(t.slug)}
                      className={cn(
                        "rounded-xl border-2 px-3 py-1.5 text-sm font-medium transition-colors",
                        selectedTopics.has(t.slug)
                          ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:border-orange-400 dark:text-orange-400"
                          : "border-border text-foreground hover:border-orange-400 hover:bg-orange-50 dark:hover:border-orange-500 dark:hover:bg-orange-400/10"
                      )}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Options */}
          {subjectSlug && (
            <section className="space-y-5">
              <h2 className="font-manrope text-xl font-bold tracking-tight text-foreground">Options</h2>

              {/* Number of questions */}
              <div className="flex items-center gap-4">
                <label className="w-44 shrink-0 text-sm font-medium text-foreground">
                  Number of questions
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNumQuestions((n) => Math.max(1, n - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-border bg-muted text-lg font-bold text-foreground transition-colors hover:bg-border"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    className="h-9 w-16 rounded-xl border-2 border-border bg-background text-center text-base font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button
                    type="button"
                    onClick={() => setNumQuestions((n) => Math.min(100, n + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-border bg-muted text-lg font-bold text-foreground transition-colors hover:bg-border"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Level */}
              <div className="flex items-center gap-4">
                <span className="w-44 shrink-0 text-sm font-medium text-foreground">Level</span>
                <div className="flex gap-2">
                  {[{ v: "all", l: "All" }, { v: "hl", l: "HL" }, { v: "sl", l: "SL" }].map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setLevelFilter(v)}
                      className={cn(
                        "rounded-xl border-2 px-3 py-1.5 text-sm font-medium transition-colors",
                        levelFilter === v
                          ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:border-orange-400 dark:text-orange-400"
                          : "border-border text-foreground hover:border-orange-400 hover:bg-orange-50 dark:hover:border-orange-500 dark:hover:bg-orange-400/10"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Include completed */}
              <div className="flex items-center gap-4">
                <span className="w-44 shrink-0 text-sm font-medium text-foreground">Include completed</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeCompleted}
                  onClick={() => setIncludeCompleted((v) => !v)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400",
                    includeCompleted ? "bg-orange-500 dark:bg-orange-400" : "bg-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                      includeCompleted ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </section>
          )}

          {/* Generate button */}
          {subjectSlug && (
            <div className="border-t border-border pt-6 pb-8">
              <button
                type="button"
                onClick={generate}
                disabled={!canGenerate || generating}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-base font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400",
                  canGenerate && !generating
                    ? "cursor-pointer bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-400 dark:text-black dark:hover:bg-orange-300"
                    : "cursor-not-allowed bg-muted text-muted-foreground"
                )}
              >
                <CentralIcon {...centralIconPropsFilled20} name="IconPencilSparkle" className="size-5" ariaHidden />
                {generating ? "Generating…" : "Generate Exam"}
              </button>
              {!includeCompleted && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Only unattempted questions will be included.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Exam view ────────────────────────────────────────────────────────────────

function ExamView({
  questions,
  subjectTitle,
  answersShown,
  showAllAnswers,
  examDone,
  onToggleAnswer,
  onToggleDone,
  onRevealAll,
  onNewExam,
  onRegenerate,
}: {
  questions: Question[];
  subjectSlug: string;
  subjectTitle: string;
  answersShown: Set<string>;
  showAllAnswers: boolean;
  examDone: Set<string>;
  onToggleAnswer: (id: string) => void;
  onToggleDone: (id: string) => void;
  onRevealAll: () => void;
  onNewExam: () => void;
  onRegenerate: () => void;
}) {
  const doneCount = examDone.size;
  const total = questions.length;
  const hasAnyAnswer = questions.some(
    (q) =>
      q.options?.some((o) => o.correct) ||
      q.parts?.some((p) => p.markscheme) ||
      q.markscheme
  );

  return (
    <div className="container mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pt-12 print:max-w-none print:p-0">
      {/* Exam header */}
      <div className="mb-8 space-y-4 print:mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
          <div>
            <h1 className="font-manrope text-3xl font-bold tracking-tight text-foreground">
              Practice Exam
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {subjectTitle} · {total} question{total !== 1 ? "s" : ""}
              {doneCount > 0 && ` · ${doneCount}/${total} done`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onNewExam}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              ← New exam
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <CentralIcon {...centralIconPropsFilled20} name="IconShuffle" className="size-4" ariaHidden />
              Regenerate
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <CentralIcon {...centralIconPropsFilled20} name="IconPrinter" className="size-4" ariaHidden />
              Print
            </button>
            {hasAnyAnswer && !showAllAnswers && (
              <button
                type="button"
                onClick={onRevealAll}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 dark:bg-orange-400 dark:text-black"
              >
                Reveal all answers
              </button>
            )}
          </div>
        </div>
        {/* Print header */}
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">{subjectTitle} — Practice Exam</h1>
          <p className="text-sm text-gray-600">{total} questions</p>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-10 print:space-y-8">
        {questions.map((q, idx) => {
          const isDone = examDone.has(q.id);
          const isAnswerShown = answersShown.has(q.id);
          const isMC = q.questionType === "MC" || (q.questionType == null && (q.options?.length ?? 0) > 0);
          const sortedParts = [...(q.parts ?? [])].sort((a, b) => a.order - b.order);
          const hasAnswer =
            (isMC && q.options?.some((o) => o.correct)) ||
            sortedParts.some((p) => p.markscheme) ||
            Boolean(q.markscheme);

          return (
            <article
              key={q.id}
              className={cn(
                "rounded-3xl border-2 bg-background p-5 transition-colors print:rounded-none print:border print:border-black print:p-4 print:break-inside-avoid",
                isDone ? "border-green-300 dark:border-green-700/60" : "border-border"
              )}
            >
              {/* Question header */}
              <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-manrope text-base font-bold text-foreground">Q{idx + 1}</span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{levelLabel(q.level)}</span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{paperLabel(q.paper)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Mark as done */}
                  <button
                    type="button"
                    onClick={() => onToggleDone(q.id)}
                    title={isDone ? "Mark as not done" : "Mark as done"}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                      isDone
                        ? "bg-green-500/20 text-green-700 dark:text-green-400"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <CentralIcon {...centralIconPropsFilled24} name="IconCircleCheck" className="size-5 [color:inherit]" ariaHidden />
                  </button>
                  {/* Answer toggle */}
                  {hasAnswer && (
                    <button
                      type="button"
                      onClick={() => onToggleAnswer(q.id)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                        isAnswerShown
                          ? "bg-muted text-foreground hover:bg-border"
                          : "bg-accent-primary text-accent-primary-foreground hover:bg-accent-primary/80"
                      )}
                    >
                      {isAnswerShown ? "Hide" : "Answer"}
                    </button>
                  )}
                </div>
              </div>
              {/* Print question number */}
              <p className="mb-2 hidden font-bold print:block">Question {idx + 1}</p>

              {/* Specification */}
              <div className="prose prose-neutral max-w-none text-pretty text-foreground/80 dark:prose-invert prose-strong:font-semibold print:text-black">
                <Streamdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={[rehypeKatex]} className="contents" controls={{ table: false }}>
                  {q.specification}
                </Streamdown>
              </div>

              {/* LA parts */}
              {sortedParts.length > 0 && (
                <div className="mt-3 space-y-4">
                  {sortedParts.map((part, pIdx) => (
                    <div key={part.id} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 font-mono text-sm font-bold text-accent-primary-foreground print:text-black">{pIdx + 1}.</span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex justify-between gap-2">
                          <div className="prose prose-neutral max-w-none text-pretty text-foreground/80 dark:prose-invert prose-strong:font-semibold print:text-black">
                            <Streamdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={[rehypeKatex]} className="contents" controls={{ table: false }}>
                              {part.content}
                            </Streamdown>
                          </div>
                          <span className="shrink-0 font-mono text-sm text-muted-foreground print:text-black">[{part.marks}]</span>
                        </div>
                        {/* Answer space for printing */}
                        <div className="hidden h-20 rounded-xl border border-dashed border-gray-300 print:block" />
                        {/* Per-part markscheme */}
                        {isAnswerShown && part.markscheme && (
                          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-3 dark:border-green-700/40 dark:bg-green-950/20">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">Markscheme</p>
                            <div className="prose prose-sm prose-neutral max-w-none dark:prose-invert">
                              <Streamdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={[rehypeKatex]} className="contents" controls={{ table: false }}>
                                {part.markscheme}
                              </Streamdown>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Top-level markscheme for LA */}
              {isAnswerShown && !isMC && q.markscheme && !sortedParts.some((p) => p.markscheme) && (
                <div className="mt-3 rounded-xl border-2 border-green-200 bg-green-50 p-3 dark:border-green-700/40 dark:bg-green-950/20">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">Markscheme</p>
                  <div className="prose prose-sm prose-neutral max-w-none dark:prose-invert">
                    <Streamdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={[rehypeKatex]} className="contents" controls={{ table: false }}>
                      {q.markscheme}
                    </Streamdown>
                  </div>
                </div>
              )}

              {/* MC options */}
              {isMC && (q.options?.length ?? 0) > 0 && (
                <div className="mt-3 space-y-1.5">
                  {[...(q.options ?? [])].sort((a, b) => a.order - b.order).map((opt, oIdx) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    const showCorrect = isAnswerShown && opt.correct;
                    const showWrong = isAnswerShown && !opt.correct;
                    return (
                      <div key={opt.id} className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold transition-colors print:border print:border-black",
                            showCorrect
                              ? "border-green-500 bg-green-500/10 text-green-700 dark:border-green-400 dark:text-green-400"
                              : showWrong
                              ? "border-border opacity-40"
                              : "border-border text-muted-foreground"
                          )}
                        >
                          {showCorrect ? "✓" : letter}
                        </div>
                        <span
                          className={cn(
                            "prose prose-neutral max-w-none flex-1 text-sm dark:prose-invert prose-strong:font-semibold print:text-black",
                            showCorrect ? "text-green-700 dark:text-green-400" : showWrong ? "opacity-40" : "text-foreground/80"
                          )}
                        >
                          <Streamdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={[rehypeKatex]} className="contents" controls={{ table: false }}>
                            {opt.content}
                          </Streamdown>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Bottom bar */}
      {total > 0 && (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 pb-8 print:hidden">
          <p className="text-sm text-muted-foreground">
            {doneCount}/{total} questions done
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onNewExam}
              className="rounded-xl border-2 border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              ← New exam
            </button>
            {hasAnyAnswer && !showAllAnswers && (
              <button
                type="button"
                onClick={onRevealAll}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 dark:bg-orange-400 dark:text-black"
              >
                Reveal all answers
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
