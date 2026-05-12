import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { HiChevronDown } from "react-icons/hi";
import { cn } from "@/lib/utils";
import type { NotesIndexTopic } from "@/types/notesIndex";

function ProgressCircle({ className, r = 8.25, strokeWidth = 3.5 }: { className?: string; r?: number; strokeWidth?: number }) {
  return (
    <div className={cn("relative flex-none", className)}>
      <div className={cn("relative", className)} data-state="closed">
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
          <circle className="text-black/5 dark:text-white/10" cx="12" cy="12" fill="none" r={r} stroke="currentColor" strokeWidth={strokeWidth} />
        </svg>
      </div>
    </div>
  );
}

type Mode = "notes" | "flashcards" | "questionbank";

function getLinkTo(mode: Mode): string {
  if (mode === "notes") return "/ib/$subject/$noteslug/notes";
  if (mode === "questionbank") return "/ib/$subject/$topicslug/questionbank";
  return "/ib/$subject/$topicslug/flashcards";
}

function SubtopicRow({ topic, subjectSlug, mode }: { topic: NotesIndexTopic; subjectSlug: string; mode: Mode }) {
  const to = getLinkTo(mode);
  const params =
    mode === "notes"
      ? { subject: subjectSlug, noteslug: topic.slug }
      : { subject: subjectSlug, topicslug: topic.slug };
  return (
    <Link to={to as "/"} params={params as any} className="@container flex w-full items-center gap-3 rounded-2xl border-b-0 p-2.5 hover:bg-muted">
      <div className="flex-none"><ProgressCircle className="h-8 w-8" /></div>
      <div className="gap-1.5 text-left font-medium text-foreground transition-colors text-lg leading-6 flex w-full min-w-0 @sm:flex-row flex-col justify-between gap-x-2 gap-y-1">
        <p className="truncate-3 flex-auto">{topic.title}</p>
      </div>
    </Link>
  );
}

function TopLevelTopic({ topic, subjectSlug, defaultOpen, mode }: { topic: NotesIndexTopic; subjectSlug: string; defaultOpen: boolean; mode: Mode }) {
  const [open, setOpen] = useState(defaultOpen);
  const children = topic.children ?? [];
  const hasOwnNotes = !!topic.path;
  const hasChildren = children.length > 0;

  if (!hasChildren) {
    if (hasOwnNotes) {
      return (
        <div className="rounded-2xl bg-background" data-orientation="vertical">
          <Link
            to={getLinkTo(mode) as "/"}
            params={
              (mode === "notes"
                ? { subject: subjectSlug, noteslug: topic.slug }
                : { subject: subjectSlug, topicslug: topic.slug }) as any
            }
            className="block rounded-2xl p-0 hover:bg-muted/50 transition-colors"
          >
            <div className="@container flex items-center gap-3 rounded-2xl p-2.5 pr-2">
              <div className="flex-none"><ProgressCircle className="h-8 w-8" /></div>
              <div className="min-w-0 flex-auto">
                <div className="flex w-full min-w-0 items-center justify-between">
                  <div className="gap-1.5 text-left font-medium text-foreground transition-colors text-lg leading-7 min-w-0">
                    <p className="truncate-3 w-fit text-lg leading-6">{topic.title}</p>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="rounded-2xl bg-background" data-orientation="vertical">
      <div data-state={open ? "open" : "closed"} data-orientation="vertical" className="rounded-2xl p-0">
        <div className="@container flex items-center gap-3 rounded-2xl p-2.5 pr-2">
          <div className="flex-none"><ProgressCircle className="h-8 w-8" /></div>
          <div className="min-w-0 flex-auto">
            <h3 data-orientation="vertical" data-state={open ? "open" : "closed"} className="flex">
              <button type="button" aria-expanded={open} data-state={open ? "open" : "closed"} data-orientation="vertical" className="flex-1 items-center font-medium transition-all [&[data-state=open]>div>svg]:rotate-180 flex w-full justify-between py-0" onClick={() => setOpen(!open)}>
                <div className="flex w-full min-w-0 items-center justify-between">
                  <div className="gap-1.5 text-left font-medium text-foreground transition-colors text-lg leading-7 min-w-0">
                    <p className="truncate-3 w-fit text-lg leading-6">{topic.title}</p>
                    <div className="mt-1 flex flex-none @sm:flex-row flex-col items-start @sm:items-center @sm:gap-3 gap-1">
                      <span className="h-4 whitespace-nowrap font-medium text-muted-foreground text-base">{children.length} subtopics</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <HiChevronDown aria-hidden className="size-5 shrink-0 opacity-60 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                </div>
              </button>
            </h3>
          </div>
        </div>
        {open && (
          <div data-state="open" role="region" data-orientation="vertical" className="overflow-hidden text-sm transition-all">
            <div className="pt-0 pb-2 mt-1.5 rounded-xl bg-background">
              <div className="flex flex-col gap-0.5 pl-5">
                {children.map((child) =>
                  (child.children?.length ?? 0) > 0 ? (
                    <TopLevelTopic key={child.slug} topic={child} subjectSlug={subjectSlug} defaultOpen={defaultOpen} mode={mode} />
                  ) : (
                    <SubtopicRow key={child.slug} topic={child} subjectSlug={subjectSlug} mode={mode} />
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubjectAccordion({
  topics,
  subjectSlug,
  defaultExpandAll = false,
  mode = "notes",
}: {
  topics: NotesIndexTopic[];
  subjectSlug: string;
  defaultExpandAll?: boolean;
  mode?: Mode;
}) {
  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground font-medium">
          {mode === "flashcards" ? "No flashcards available for this subject yet."
            : mode === "questionbank" ? "No questionbank available for this subject yet."
            : "No notes available for this subject yet."}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {topics.map((topic) => (
        <TopLevelTopic key={topic.slug} topic={topic} subjectSlug={subjectSlug} defaultOpen={defaultExpandAll} mode={mode} />
      ))}
    </div>
  );
}
