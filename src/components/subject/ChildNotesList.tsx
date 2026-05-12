import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { NotesIndexTopic } from "@/types/notesIndex";

function ProgressCircle({ className }: { className?: string }) {
  return (
    <div className={cn("relative m-1 h-6 w-6 flex-none", className)}>
      <div className="pointer-events-none absolute inset-0" data-state="closed">
        <div className="absolute inset-0 rounded-full border-2 border-black/10 dark:border-white/20"></div>
      </div>
    </div>
  );
}

function ChildNoteCard({ topic, subjectSlug }: { topic: NotesIndexTopic; subjectSlug: string }) {
  const readTime = Math.floor(Math.random() * 10) + 3;
  return (
    <div className="group flex items-start gap-0 rounded-2xl p-2 transition-colors hover:bg-muted">
      <ProgressCircle />
      <Link className="my-auto flex flex-1 flex-col gap-2 pl-2 sm:flex-row" to="/ib/$subject/$noteslug/notes" params={{ subject: subjectSlug, noteslug: topic.slug }}>
        <div className="my-auto">
          <p className="truncate-1 font-medium text-foreground/75 text-lg">{topic.title}</p>
          <p className="whitespace-nowrap font-medium text-muted-foreground text-sm">{readTime} minute read</p>
        </div>
      </Link>
    </div>
  );
}

export default function ChildNotesList({ topics, subjectSlug }: { topics: NotesIndexTopic[]; subjectSlug: string }) {
  if (!topics?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {topics.map((topic) => (
        <ChildNoteCard key={topic.slug} topic={topic} subjectSlug={subjectSlug} />
      ))}
    </div>
  );
}
