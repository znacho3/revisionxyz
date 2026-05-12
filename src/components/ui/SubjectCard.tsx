import { Link } from "@tanstack/react-router";

export type SubjectCardProps = {
  slug: string;
  title: string;
  coverImageUrl: string;
  /** When true, card links to subject notes (/ib/$subject/notes) instead of subject page */
  linkToNotes?: boolean;
  /** When true, card links to flashcards (/ib/$subject/flashcards) instead of subject page */
  linkToFlashcards?: boolean;
  /** When true, card links to questionbank (/ib/$subject/questionbank) instead of subject page */
  linkToQuestionbank?: boolean;
};

export function SubjectCard({ slug, title, coverImageUrl, linkToNotes, linkToFlashcards, linkToQuestionbank }: SubjectCardProps) {
  const href = linkToQuestionbank
    ? "/ib/$subject/questionbank"
    : linkToFlashcards
      ? "/ib/$subject/flashcards"
      : linkToNotes
        ? "/ib/$subject/notes"
        : "/ib/$subject";
  return (
    <div className="@container">
      <Link
        to={href}
        params={{ subject: slug }}
        aria-label={title}
        className="group relative isolate block max-w-[360px] flex-none cursor-pointer snap-center overflow-hidden rounded-2xl p-2 transition-all @[120px]:p-3 @[160px]:p-6 @[200px]:p-8"
      >
        <img
          alt=""
          loading="lazy"
          width={36}
          height={48}
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl saturate-200 transition-opacity group-hover:opacity-50 dark:brightness-150 dark:saturate-100"
          src={coverImageUrl}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <div className="relative">
          <div className="relative aspect-[3/4] w-full transition-transform duration-300 ease-out group-hover:scale-[100.5%] group-active:!scale-100 @[120px]:group-hover:scale-[101%] @[160px]:group-hover:scale-[101.5%] @[200px]:group-hover:scale-[102%]">
            <div className="relative h-full w-full overflow-hidden rounded-r-2xl rounded-l-lg border-none shadow-xl">
              <img alt={title} loading="lazy" width={233} height={290} decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" src={coverImageUrl} onError={(e) => { e.currentTarget.style.display = "none"; }} />
              <div className="absolute inset-0 rounded-r-2xl rounded-l-lg border-2 border-white transition-all group-hover:border-white/30 @[120px]:border-[3px] @[160px]:border-4 dark:border-white/30" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
