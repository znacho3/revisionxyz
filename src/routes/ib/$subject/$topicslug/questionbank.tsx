import { useState, useEffect, useMemo } from "react";
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { HiChevronRight, HiSelector } from "react-icons/hi";
import { PiArrowsOutSimple } from "react-icons/pi";
import { CentralIcon } from "@central-icons-react/all";
import { Streamdown, defaultRemarkPlugins } from "streamdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import subjectsDataRaw from "@/data/ib-subjects.json";
import SubjectBackground from "@/components/subject/SubjectBackground";
import { supabase } from "@/lib/supabase";
import TopicModeTabs from "@/components/subject/TopicModeTabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AnswerInput from "@/components/questionbank/AnswerInput";
import { centralIconPropsFilled24 } from "@/lib/icon-props";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types/ib";
import "@/questionbank.css";
import "katex/dist/katex.min.css";

const COMPLETION_OPTIONS = [
  { value: "all", label: "All" },
  { value: "unattempted", label: "Unattempted" },
  { value: "completed", label: "Completed" },
] as const;

function paperLabel(paper: string): string {
  const map: Record<string, string> = {
    "ib-1": "Paper 1",
    "ib-2": "Paper 2",
    "ib-3": "Paper 3",
    "ib-1a": "Paper 1A",
    "ib-1b": "Paper 1B",
    "ib-unknown": "Unknown",
  };
  return map[paper] ?? paper;
}

function levelLabel(level: string): string {
  if (level === "hl") return "HL";
  if (level === "sl") return "SL";
  if (level === "both") return "Both";
  return level;
}

function questionTypeLabel(t: string): string {
  if (t === "MC") return "Multiple choice";
  if (t === "LA") return "Long answer";
  return t;
}

const subjectsData = subjectsDataRaw as Subject[];

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

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const QUESTIONBANK_REMARK_PLUGINS = [...Object.values(defaultRemarkPlugins), remarkMath];

export const Route = createFileRoute("/ib/$subject/$topicslug/questionbank")({
  component: TopicQuestionbankPage,
});

type FilterOption = { value: string; label: string };
function FilterDropdown({
  label,
  value,
  onValueChange,
  options,
  placeholder = "All",
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: FilterOption[];
  placeholder?: string;
}) {
  const displayLabel = options.find((o) => o.value === value)?.label ?? placeholder;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-12 w-[160px] items-center justify-between gap-2 rounded-2xl border-2 border-border bg-muted px-4 py-2 font-medium text-base text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="truncate">{displayLabel}</span>
            <HiSelector className="size-5 flex-none opacity-50" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
            {options.map((o) => (
              <DropdownMenuRadioItem key={o.value} value={o.value}>
                {o.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function TopicQuestionbankPage() {
  const { subject: subjectSlug, topicslug } = useParams({ strict: false });
  const navigate = useNavigate();
  const subject = subjectsData.find((s) => s.slug === subjectSlug);
  const [rawQuestions, setRawQuestions] = useState<Question[]>([]);
  const [topicTitle, setTopicTitle] = useState<string>("");
  const [subjectTitle, setSubjectTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [completion, setCompletion] = useState<string>("all");
  const [paper, setPaper] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [questionType, setQuestionType] = useState<string>("all");
  const [answersShown, setAnswersShown] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const lsKey = subjectSlug && topicslug ? `qb_completed_${subjectSlug}_${topicslug}` : null;

  // Load completed state from localStorage when topic changes
  useEffect(() => {
    if (!lsKey) { setCompleted(new Set()); return; }
    try {
      const stored = localStorage.getItem(lsKey);
      setCompleted(new Set(stored ? JSON.parse(stored) : []));
    } catch {
      setCompleted(new Set());
    }
    setAnswersShown(new Set());
  }, [lsKey]);

  function toggleCompleted(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (lsKey) {
        try { localStorage.setItem(lsKey, JSON.stringify([...next])); } catch {}
      }
      return next;
    });
  }

  function toggleAnswer(id: string) {
    setAnswersShown((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    if (!subjectSlug || !topicslug) {
      navigate({ to: "/ib", replace: true });
      return;
    }
    setLoading(true);
    setError(false);
    setRawQuestions([]);

    supabase
      .from("questions")
      .select("data")
      .eq("subject_slug", subjectSlug)
      .eq("topic_slug", topicslug)
      .then(({ data: rows }) => {
        if (!rows || rows.length === 0) { setError(true); setLoading(false); return; }
        setRawQuestions(rows.map((r) => r.data as Question));
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [subjectSlug, topicslug, navigate]);

  useEffect(() => {
    if (!subjectSlug) return;
    supabase
      .from("subjects")
      .select("data")
      .eq("slug", subjectSlug)
      .single()
      .then(({ data: row }) => {
        const detail = row?.data;
        if (!detail) return;
        setSubjectTitle(detail.title ?? "");
        const flat: { slug: string; title: string }[] = [];
        (detail.topics ?? []).forEach((t: any) => {
          if (t.childTopics?.length) {
            t.childTopics.forEach((c: any) => flat.push({ slug: c.slug, title: c.title }));
          } else {
            flat.push({ slug: t.slug, title: t.title });
          }
        });
        const topic = flat.find((t) => t.slug === topicslug);
        if (topic) setTopicTitle(topic.title);
      })
      .catch(() => {});
  }, [subjectSlug, topicslug]);

  const slugForLinks = subjectSlug ?? subject?.slug ?? "";
  const title = topicTitle || humanizeSlug(topicslug ?? "");
  const cover = subject?.coverImageUrl ?? "";

  const allQuestions = useMemo(
    () => rawQuestions.filter((q) => q.questionSet !== "TEACHER"),
    [rawQuestions]
  );

  const filterOptions = useMemo(() => {
    const papers = new Set<string>();
    const levels = new Set<string>();
    const types = new Set<string>();
    allQuestions.forEach((q) => {
      if (q.paper) papers.add(q.paper);
      if (q.level) levels.add(q.level);
      const t = q.questionType ?? (q.options?.length ? "MC" : "LA");
      if (t) types.add(t);
    });
    const paperOrder = ["ib-1", "ib-1a", "ib-1b", "ib-2", "ib-3", "ib-unknown"];
    const levelOrder = ["sl", "hl", "both"];
    const typeOrder = ["MC", "LA"];
    const paperOpts = [{ value: "all", label: "All papers" }, ...Array.from(papers).sort((a, b) => paperOrder.indexOf(a) - paperOrder.indexOf(b)).map((p) => ({ value: p, label: paperLabel(p) }))];
    const levelOpts = [{ value: "all", label: "All levels" }, ...Array.from(levels).sort((a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b)).map((l) => ({ value: l, label: levelLabel(l) }))];
    const typeOpts = [{ value: "all", label: "All types" }, ...Array.from(types).sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b)).map((t) => ({ value: t, label: questionTypeLabel(t) }))];
    return { paperOpts, levelOpts, typeOpts };
  }, [allQuestions]);

  const questions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (completion === "completed" && !completed.has(q.id)) return false;
      if (completion === "unattempted" && completed.has(q.id)) return false;
      if (paper !== "all" && q.paper !== paper) return false;
      if (level !== "all") {
        if (level === "both" && q.level !== "both") return false;
        if (level === "sl" && q.level !== "sl") return false;
        if (level === "hl" && q.level !== "hl") return false;
      }
      if (questionType !== "all") {
        const t = q.questionType ?? (q.options?.length ? "MC" : "LA");
        if (t !== questionType) return false;
      }
      return true;
    });
  }, [allQuestions, completion, completed, paper, level, questionType]);

  useEffect(() => {
    if (allQuestions.length === 0) return;
    const papers = new Set(allQuestions.map((q) => q.paper));
    const levels = new Set(allQuestions.map((q) => q.level));
    const types = new Set(allQuestions.map((q) => q.questionType ?? (q.options?.length ? "MC" : "LA")));
    setPaper((p) => (p !== "all" && !papers.has(p) ? "all" : p));
    setLevel((l) => (l !== "all" && !levels.has(l) ? "all" : l));
    setQuestionType((t) => (t !== "all" && !types.has(t) ? "all" : t));
  }, [allQuestions]);

  if (!subjectSlug || !topicslug) return null;

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <p className="text-muted-foreground">Questionbank not found.</p>
        <Link
          to="/ib/$subject/questionbank"
          params={{ subject: slugForLinks }}
          className="mt-4 inline-block text-foreground underline hover:no-underline"
        >
          ← Back to {subjectTitle || subject?.title || "subject"} questionbank
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-0 w-full">
      {cover ? <SubjectBackground coverImageUrl={cover} /> : null}
      <div className="questionbank-page relative z-10 mx-auto w-full max-w-4xl px-4 pb-16 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <nav aria-label="breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 break-words font-medium text-muted-foreground sm:gap-1.5">
            <li className="inline-flex max-w-[48em] items-center gap-1.5 truncate">
              <Link className="max-w-20 truncate transition-colors hover:text-foreground md:max-w-none" to="/ib">
                IB
              </Link>
            </li>
            <li aria-hidden="true" className="[&>svg]:size-5" role="presentation">
              <HiChevronRight aria-hidden className="size-5" />
            </li>
            <li className="inline-flex max-w-[48em] items-center gap-1.5 truncate">
              <Link
                className="max-w-20 truncate transition-colors hover:text-foreground md:max-w-none"
                to="/ib/$subject/questionbank"
                params={{ subject: slugForLinks }}
              >
                {subjectTitle || subject?.title || "Subject"}
              </Link>
            </li>
            <li aria-hidden="true" className="[&>svg]:size-5" role="presentation">
              <HiChevronRight aria-hidden className="size-5" />
            </li>
            <li className="inline-flex max-w-[48em] items-center gap-1.5 truncate font-medium text-foreground">
              {title}
            </li>
          </ol>
        </nav>
        <header className="mt-2 mb-8 flex items-start justify-between gap-2">
          <h1 className="h2 truncate-3 pr-1 pb-2 font-title tracking-tighter">
            {title} Questionbank
          </h1>
        </header>
        <div className="mb-6 hidden sm:block">
          <TopicModeTabs activeId="questionbank" />
        </div>
        <div className="mt-8">
          {loading ? (
            <p className="text-muted-foreground">Loading questions…</p>
          ) : (
            <>
              <div className="mb-8 flex w-full flex-wrap items-end gap-2">
                <FilterDropdown
                  label="Completion"
                  value={completion}
                  onValueChange={setCompletion}
                  options={[...COMPLETION_OPTIONS]}
                />
                <FilterDropdown
                  label="Paper"
                  value={paper}
                  onValueChange={setPaper}
                  options={filterOptions.paperOpts}
                  placeholder="All papers"
                />
                <FilterDropdown
                  label="Level"
                  value={level}
                  onValueChange={setLevel}
                  options={filterOptions.levelOpts}
                  placeholder="All levels"
                />
                {filterOptions.typeOpts.length > 2 && (
                  <FilterDropdown
                    label="Type"
                    value={questionType}
                    onValueChange={setQuestionType}
                    options={filterOptions.typeOpts}
                    placeholder="All types"
                  />
                )}
              </div>

              {questions.length === 0 ? (
                <p className="text-muted-foreground">No questions match the current filters.</p>
              ) : (
                <div className="relative flex flex-col gap-20">
                  <div className="space-y-20">
                    {questions.map((q, qIdx) => {
                      const isDone = completed.has(q.id);
                      const isAnswerShown = answersShown.has(q.id);
                      const isMC = q.questionType === "MC" || (q.questionType == null && q.options?.length > 0);
                      const sortedParts = [...(q.parts ?? [])].sort((a, b) => a.order - b.order);
                      const hasMarkscheme = sortedParts.some((p) => p.markscheme) || Boolean(q.markscheme);

                      return (
                        <article
                          key={q.id}
                          id={q.id}
                          className={cn(
                            "@container w-full min-w-0 scroll-mt-16 rounded-3xl border-2 bg-background transition-all print:break-inside-avoid print:rounded-none print:border print:border-black",
                            isDone ? "border-green-300 dark:border-green-700/60" : "border-border"
                          )}
                        >
                          <div className="px-5 py-3 @lg:px-7 @lg:py-5">
                            <div className="mb-5 flex w-full flex-col flex-wrap items-start justify-between gap-4 gap-x-4 lg:flex-row lg:items-center">
                              <div className="flex w-full flex-col flex-wrap items-start justify-between gap-3 sm:flex-row sm:items-center">
                                <div className="flex flex-wrap items-center gap-1.5 font-medium font-sans">
                                  <span className="font-title tracking-tight text-lg">
                                    Question {qIdx + 1}
                                  </span>
                                  <span className="block flex-none rounded-full bg-border px-2.5 py-1 font-title text-sm text-foreground print:hidden">
                                    {levelLabel(q.level)}
                                  </span>
                                  <span className="block flex-none rounded-full bg-border px-2.5 py-1 font-title text-sm text-foreground print:hidden">
                                    {paperLabel(q.paper)}
                                  </span>
                                  {(q.questionType === "MC" || q.questionType === "LA" || (q.questionType == null && (q.options?.length ? "MC" : "LA"))) && (
                                    <span className="block flex-none rounded-full bg-border px-2.5 py-1 font-title text-sm text-foreground print:hidden">
                                      {questionTypeLabel(q.questionType ?? (q.options?.length ? "MC" : "LA"))}
                                    </span>
                                  )}
                                </div>
                                <div className="-mx-2 flex items-center justify-center gap-1.5 print:hidden">
                                  {/* Mark as done */}
                                  <button
                                    type="button"
                                    onClick={() => toggleCompleted(q.id)}
                                    className={cn(
                                      "inline-flex w-fit items-center justify-center gap-1 rounded-2xl px-2 py-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground/50",
                                      isDone
                                        ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                    aria-label={isDone ? "Mark as not done" : "Mark as done"}
                                    title={isDone ? "Mark as not done" : "Mark as done"}
                                  >
                                    <CentralIcon {...centralIconPropsFilled24} name="IconCircleCheck" className="size-6 [color:inherit]" ariaHidden />
                                  </button>
                                  <button
                                    type="button"
                                    className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl text-muted-foreground transition-all hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground/50 lg:flex"
                                    aria-label="Fullscreen"
                                  >
                                    <PiArrowsOutSimple className="size-6" aria-hidden />
                                  </button>
                                  {/* Show/hide answer */}
                                  <button
                                    type="button"
                                    onClick={() => toggleAnswer(q.id)}
                                    className={cn(
                                      "inline-flex w-fit items-center justify-center gap-1 rounded-2xl px-2.5 py-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50",
                                      isAnswerShown
                                        ? "bg-muted text-foreground hover:bg-border"
                                        : "bg-accent-primary px-2.5 py-2 text-accent-primary-foreground hover:bg-accent-primary/80"
                                    )}
                                    disabled={!isMC && !hasMarkscheme}
                                    title={!isMC && !hasMarkscheme ? "No answer available" : undefined}
                                  >
                                    <span className="px-1 font-medium">
                                      {isAnswerShown ? "Hide" : "Answer"}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Question specification */}
                            <div className="prose prose-neutral block max-w-none space-y-3 overflow-hidden text-pretty text-foreground/75 dark:prose-invert marker:text-inherit prose-strong:font-semibold print:text-black">
                              <Streamdown
                                remarkPlugins={QUESTIONBANK_REMARK_PLUGINS}
                                rehypePlugins={[rehypeKatex]}
                                className="contents"
                                controls={{ table: false }}
                              >
                                {q.specification}
                              </Streamdown>
                            </div>

                            {/* LA parts */}
                            {sortedParts.length > 0 && (
                              <div className="mt-2 flex w-full flex-col gap-2">
                                <div className="flex flex-col gap-6">
                                  {sortedParts.map((part, partIdx) => (
                                    <div key={part.id} className="flex items-start gap-4">
                                      <div className="flex-1">
                                        <div className="mt-2 mb-2 flex items-start gap-1">
                                          <span className="mt-0.5 whitespace-nowrap font-mono font-bold text-accent-primary-foreground print:text-black">
                                            {partIdx + 1}.
                                          </span>
                                          <div className="relative flex w-full justify-between gap-3">
                                            <div className="flex-auto">
                                              <div className="flex justify-between gap-1">
                                                <div className="prose prose-neutral block max-w-none space-y-3 overflow-hidden text-pretty text-foreground/75 dark:prose-invert marker:text-inherit prose-strong:font-semibold print:text-black">
                                                  <Streamdown
                                                    remarkPlugins={QUESTIONBANK_REMARK_PLUGINS}
                                                    rehypePlugins={[rehypeKatex]}
                                                    className="contents"
                                                    controls={{ table: false }}
                                                  >
                                                    {part.content}
                                                  </Streamdown>
                                                </div>
                                                <span className="font-mono text-muted-foreground print:text-black">
                                                  [{part.marks}]
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        <AnswerInput partId={part.id} />
                                        {/* Per-part markscheme */}
                                        {isAnswerShown && part.markscheme && (
                                          <div className="mt-3 rounded-2xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-700/40 dark:bg-green-950/20">
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                                              Markscheme
                                            </p>
                                            <div className="prose prose-sm prose-neutral max-w-none dark:prose-invert text-foreground/80">
                                              <Streamdown
                                                remarkPlugins={QUESTIONBANK_REMARK_PLUGINS}
                                                rehypePlugins={[rehypeKatex]}
                                                className="contents"
                                                controls={{ table: false }}
                                              >
                                                {part.markscheme}
                                              </Streamdown>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Top-level markscheme (LA with single markscheme field) */}
                            {isAnswerShown && !isMC && q.markscheme && !sortedParts.some((p) => p.markscheme) && (
                              <div className="mt-4 rounded-2xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-700/40 dark:bg-green-950/20">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                                  Markscheme
                                </p>
                                <div className="prose prose-sm prose-neutral max-w-none dark:prose-invert text-foreground/80">
                                  <Streamdown
                                    remarkPlugins={QUESTIONBANK_REMARK_PLUGINS}
                                    rehypePlugins={[rehypeKatex]}
                                    className="contents"
                                    controls={{ table: false }}
                                  >
                                    {q.markscheme}
                                  </Streamdown>
                                </div>
                              </div>
                            )}

                            {/* MC options */}
                            {isMC && q.options?.length > 0 && (
                              <div className="mt-2 w-full space-y-3 print:break-inside-avoid">
                                <div role="radiogroup" aria-required={false} className="grid w-full gap-2 space-y-1">
                                  {[...q.options]
                                    .sort((a, b) => a.order - b.order)
                                    .map((opt, optIdx) => {
                                      const letter = String.fromCharCode(65 + optIdx);
                                      const showCorrect = isAnswerShown && opt.correct;
                                      const showWrong = isAnswerShown && !opt.correct;
                                      return (
                                        <div key={opt.id} className="group block w-full text-left">
                                          <div className="flex w-full flex-wrap items-center justify-between gap-2">
                                            <div className="block min-w-0 flex-1 text-left">
                                              <div className="flex items-start gap-3">
                                                <div
                                                  className={cn(
                                                    "flex h-10 w-10 flex-none items-center justify-center rounded-2xl border-2 font-medium font-title text-lg transition-colors print:border print:border-black",
                                                    showCorrect
                                                      ? "border-green-500 bg-green-500/10 text-green-700 dark:border-green-400 dark:text-green-400"
                                                      : showWrong
                                                      ? "border-border opacity-40"
                                                      : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
                                                  )}
                                                >
                                                  {showCorrect ? "✓" : letter}
                                                </div>
                                                <span
                                                  className={cn(
                                                    "prose prose-neutral dark:prose-invert flex min-h-10 flex-auto items-center space-y-3 overflow-hidden text-pretty marker:text-inherit prose-strong:font-semibold print:text-black",
                                                    showCorrect
                                                      ? "text-green-700 dark:text-green-400"
                                                      : showWrong
                                                      ? "text-foreground/40"
                                                      : "text-foreground/75"
                                                  )}
                                                >
                                                  <Streamdown
                                                    remarkPlugins={QUESTIONBANK_REMARK_PLUGINS}
                                                    rehypePlugins={[rehypeKatex]}
                                                    className="contents"
                                                    controls={{ table: false }}
                                                  >
                                                    {opt.content}
                                                  </Streamdown>
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {/* Jojo AI input */}
                            <div className="mt-5 flex flex-col items-start justify-between gap-2 py-2 sm:flex-row print:hidden">
                              <form className="flex w-full items-center gap-2 sm:w-auto sm:flex-auto">
                                <img
                                  alt="Jojo AI"
                                  loading="lazy"
                                  width="48"
                                  height="48"
                                  decoding="async"
                                  className="h-12 w-12 flex-none shrink-0 object-contain"
                                  src="https://assets.revisiondojo.com/assets/icons/jojo-gradient.svg"
                                  style={{ color: "transparent" }}
                                />
                                <input
                                  type="text"
                                  className="h-12 min-w-0 flex-1 rounded-2xl bg-muted px-4 ring-offset-background placeholder:text-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-white dark:placeholder:text-white/50"
                                  placeholder="Ask me anything!"
                                  aria-label="Ask me anything"
                                />
                                <button
                                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-primary-foreground text-2xl font-medium text-background ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
                                  disabled
                                  id="chat-submit-btn"
                                  type="submit"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" aria-hidden>
                                    <path d="M240,127.89a16,16,0,0,1-8.18,14L63.9,237.9A16.15,16.15,0,0,1,56,240a16,16,0,0,1-15-21.33l27-79.95A4,4,0,0,1,71.72,136H144a8,8,0,0,0,8-8.53,8.19,8.19,0,0,0-8.26-7.47h-72a4,4,0,0,1-3.79-2.72l-27-79.94A16,16,0,0,1,63.84,18.07l168,95.89A16,16,0,0,1,240,127.89Z"></path>
                                  </svg>
                                </button>
                              </form>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
