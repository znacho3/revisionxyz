import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
type TopicGroup = { parentSlug: string; parentTitle: string; items: TopicEntry[] };
type ExamHistoryEntry = {
  id: string;
  date: string;
  subjectSlug: string;
  subjectTitle: string;
  selectedTopics: string[];
  numQuestions: number;
  levelFilter: string;
  includeCompleted: boolean;
};

const REMARK_PLUGINS = [...Object.values(defaultRemarkPlugins), remarkMath];
const HISTORY_KEY = "exam_history";

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

function relativeDate(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return "yesterday";
  if (diffD < 7) return `${diffD}d ago`;
  return new Date(isoString).toLocaleDateString();
}

function loadHistory(): ExamHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as ExamHistoryEntry[];
  } catch {
    return [];
  }
}

// chip style helpers
const chipActive = "border-orange-500 bg-orange-500/10 text-orange-700 dark:border-orange-400 dark:text-orange-400";
const chipInactive = "border-border text-foreground hover:border-orange-400 hover:bg-orange-50 dark:hover:border-orange-500 dark:hover:bg-orange-400/10";

// ─── Configure phase ─────────────────────────────────────────────────────────

function ExamPage() {
  const ibSubjects = ibSubjectsRaw as IbSubject[];
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
  const [topicGroups, setTopicGroups] = useState<TopicGroup[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [numQuestions, setNumQuestions] = useState(10);
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [levelFilter, setLevelFilter] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<ExamHistoryEntry[]>([]);

  const pendingTopicsRef = useRef<string[] | null>(null);
  const historyRef = useRef<ExamHistoryEntry[]>([]);
  useEffect(() => { historyRef.current = history; }, [history]);

  // Exam state
  const [examQuestions, setExamQuestions] = useState<Question[] | null>(null);
  const [examSubjectSlug, setExamSubjectSlug] = useState("");
  const [answersShown, setAnswersShown] = useState<Set<string>>(new Set());
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [examDone, setExamDone] = useState<Set<string>>(new Set());

  useEffect(() => { setHistory(loadHistory()); }, []);

  // Load topics when subject changes
  useEffect(() => {
    if (!subjectSlug) { setTopicGroups([]); setSelectedTopics(new Set()); return; }
    setLoadingTopics(true);
    Promise.all([
      supabase.from("subjects").select("data").eq("slug", subjectSlug).single(),
      supabase.from("questions").select("topic_slug").eq("subject_slug", subjectSlug),
    ]).then(([{ data: subRow }, { data: qRows }]) => {
      const detail = subRow?.data as { topics?: { slug: string; title: string; childTopics?: { slug: string; title: string }[] }[] } | null;
      const qbSlugs = new Set((qRows ?? []).map((r: any) => r.topic_slug).filter(Boolean));
      const groups: TopicGroup[] = [];
      for (const t of detail?.topics ?? []) {
        if (t.childTopics?.length) {
          const valid = t.childTopics.filter((c) => qbSlugs.has(c.slug));
          if (valid.length > 0) groups.push({ parentSlug: t.slug, parentTitle: t.title, items: valid });
        } else if (qbSlugs.has(t.slug)) {
          groups.push({ parentSlug: t.slug, parentTitle: t.title, items: [{ slug: t.slug, title: t.title }] });
        }
      }
      setTopicGroups(groups);
      const flat = groups.flatMap((g) => g.items);
      if (pendingTopicsRef.current !== null) {
        const valid = new Set(flat.map((t) => t.slug));
        setSelectedTopics(new Set(pendingTopicsRef.current.filter((s) => valid.has(s))));
        pendingTopicsRef.current = null;
      } else {
        setSelectedTopics(new Set(flat.map((t) => t.slug)));
      }
      setLoadingTopics(false);
    }).catch(() => { setTopicGroups([]); setLoadingTopics(false); });
  }, [subjectSlug]);

  const allTopics = useMemo(() => topicGroups.flatMap((g) => g.items), [topicGroups]);

  // True when at least one parent topic has multiple children (needs grouped display)
  const hasNestedTopics = useMemo(
    () => topicGroups.some((g) => g.items.length > 1 || (g.items[0] && g.items[0].slug !== g.parentSlug)),
    [topicGroups]
  );

  function toggleTopic(slug: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function toggleGroup(group: TopicGroup) {
    const slugs = group.items.map((t) => t.slug);
    const allSelected = slugs.every((s) => selectedTopics.has(s));
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (allSelected) slugs.forEach((s) => next.delete(s));
      else slugs.forEach((s) => next.add(s));
      return next;
    });
  }

  function loadFromHistory(entry: ExamHistoryEntry) {
    pendingTopicsRef.current = entry.selectedTopics;
    setNumQuestions(entry.numQuestions);
    setLevelFilter(entry.levelFilter);
    setIncludeCompleted(entry.includeCompleted);
    setSubjectSlug(entry.subjectSlug);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      if (levelFilter !== "all") {
        questions = questions.filter((q) => q.level === levelFilter || q.level === "both");
      }
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

      const entry: ExamHistoryEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        subjectSlug,
        subjectTitle: availableSubjects.find((s) => s.slug === subjectSlug)?.title ?? subjectSlug,
        selectedTopics: topicList,
        numQuestions: picked.length,
        levelFilter,
        includeCompleted,
      };
      const newHistory = [entry, ...historyRef.current].slice(0, 10);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    } finally {
      setGenerating(false);
    }
  }, [subjectSlug, selectedTopics, numQuestions, includeCompleted, levelFilter, availableSubjects]);

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

  const canGenerate = subjectSlug && selectedTopics.size > 0 && !loadingTopics;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pt-12 space-y-6">

      {/* Centered header */}
      <div className="flex flex-col items-center text-center py-4 sm:py-6">
        <div className="inline-flex rounded-2xl bg-orange-100 p-3.5 text-orange-700 dark:bg-orange-400/25 dark:text-orange-300 mb-4">
          <CentralIcon {...centralIconPropsOutlined28} name="IconPencilSparkle" className="size-8" />
        </div>
        <h1 className="font-manrope text-4xl font-bold tracking-tight text-foreground">Exam Generator</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">Select a subject and topics to generate a custom practice exam</p>
      </div>

      {subjectsWithQb === null ? (
        <p className="text-center text-muted-foreground">Loading…</p>
      ) : (
        <>
          {/* Form card */}
          <div className="rounded-3xl border-2 border-border bg-card overflow-hidden">

            {/* Subject */}
            <div className="p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Subject</p>
              <div className="flex flex-wrap gap-2">
                {availableSubjects.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => setSubjectSlug(s.slug)}
                    className={cn("rounded-xl border-2 px-3 py-1.5 text-sm font-medium transition-colors", subjectSlug === s.slug ? chipActive : chipInactive)}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Topics */}
            {subjectSlug && (
              <div className="border-t border-border p-5 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Topics
                    {!loadingTopics && allTopics.length > 0 && (
                      <span className="ml-2 normal-case tracking-normal font-normal text-muted-foreground/60">
                        {selectedTopics.size}/{allTopics.length} selected
                      </span>
                    )}
                  </p>
                  {allTopics.length > 0 && !loadingTopics && (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedTopics(new Set(allTopics.map((t) => t.slug)))}
                        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        All
                      </button>
                      <span className="text-muted-foreground/30">·</span>
                      <button
                        type="button"
                        onClick={() => setSelectedTopics(new Set())}
                        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        None
                      </button>
                    </div>
                  )}
                </div>

                {loadingTopics ? (
                  <p className="text-sm text-muted-foreground">Loading topics…</p>
                ) : allTopics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No topics available for this subject.</p>
                ) : hasNestedTopics ? (
                  // Grouped by parent topic
                  <div className="space-y-5">
                    {topicGroups.map((group) => {
                      const allGroupSelected = group.items.every((t) => selectedTopics.has(t.slug));
                      return (
                        <div key={group.parentSlug}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-foreground/60 shrink-0">{group.parentTitle}</span>
                            <div className="flex-1 h-px bg-border" />
                            {group.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => toggleGroup(group)}
                                className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                              >
                                {allGroupSelected ? "Deselect" : "Select all"}
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {group.items.map((t) => (
                              <button
                                key={t.slug}
                                type="button"
                                onClick={() => toggleTopic(t.slug)}
                                className={cn("rounded-xl border-2 px-3 py-1.5 text-sm font-medium transition-colors", selectedTopics.has(t.slug) ? chipActive : chipInactive)}
                              >
                                {t.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Flat list (no nested subtopics)
                  <div className="flex flex-wrap gap-2">
                    {allTopics.map((t) => (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => toggleTopic(t.slug)}
                        className={cn("rounded-xl border-2 px-3 py-1.5 text-sm font-medium transition-colors", selectedTopics.has(t.slug) ? chipActive : chipInactive)}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Options */}
            {subjectSlug && (
              <div className="border-t border-border p-5 sm:p-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Options</p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Number of questions */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Questions</label>
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Level</label>
                    <div className="flex gap-2">
                      {[{ v: "all", l: "All" }, { v: "hl", l: "HL" }, { v: "sl", l: "SL" }].map(({ v, l }) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setLevelFilter(v)}
                          className={cn("rounded-xl border-2 px-3 py-1.5 text-sm font-medium transition-colors", levelFilter === v ? chipActive : chipInactive)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Include completed */}
                <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Include completed</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Show questions already marked as done</p>
                  </div>
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
              </div>
            )}
          </div>

          {/* Generate button */}
          {subjectSlug && (
            <button
              type="button"
              onClick={generate}
              disabled={!canGenerate || generating}
              className={cn(
                "w-full inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400",
                canGenerate && !generating
                  ? "cursor-pointer bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-400 dark:text-black dark:hover:bg-orange-300"
                  : "cursor-not-allowed bg-muted text-muted-foreground"
              )}
            >
              <CentralIcon {...centralIconPropsFilled20} name="IconPencilSparkle" className="size-5" ariaHidden />
              {generating ? "Generating…" : "Generate Exam"}
            </button>
          )}

          {/* History */}
          {history.length > 0 && (
            <section className="space-y-3 pb-8">
              <div className="flex items-center justify-between">
                <h2 className="font-manrope text-base font-bold text-foreground">Recent Exams</h2>
                <button
                  type="button"
                  onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]); }}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => loadFromHistory(entry)}
                    className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{entry.subjectTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.numQuestions} question{entry.numQuestions !== 1 ? "s" : ""}
                        {" · "}{entry.levelFilter === "all" ? "All levels" : entry.levelFilter.toUpperCase()}
                        {!entry.includeCompleted && " · Unattempted only"}
                        {" · "}{relativeDate(entry.date)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">Retry →</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
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
                        <div className="hidden h-20 rounded-xl border border-dashed border-gray-300 print:block" />
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

              {/* Top-level markscheme for LA without per-part markschemes */}
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
