import { useState, useEffect } from "react";
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { HiChevronRight } from "react-icons/hi";
import subjectsDataRaw from "@/data/ib-subjects.json";
import SubjectBackground from "@/components/subject/SubjectBackground";
import TopicModeTabs from "@/components/subject/TopicModeTabs";
import SubjectAccordion from "@/components/subject/SubjectAccordion";
import type { FlashcardsIndex, FlashcardsIndexSubject, FlashcardsIndexTopic } from "@/types/flashcardsIndex";
import type { NotesIndexTopic } from "@/types/notesIndex";
import type { Subject } from "@/types/ib";

const subjectsData = subjectsDataRaw as Subject[];

export const Route = createFileRoute('/ib/$subject/flashcards')({
  component: SubjectFlashcardsPage,
})

function SubjectFlashcardsPage() {
  const { subject: subjectSlug } = useParams({ strict: false });
  const navigate = useNavigate();
  const subject = subjectsData.find((s) => s.slug === subjectSlug);
  const [indexSubject, setIndexSubject] = useState<FlashcardsIndexSubject | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!subjectSlug) {
      setIndexSubject(null);
      setLoaded(false);
      return;
    }
    setLoaded(false);
    fetch("/flashcards-index.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((index: FlashcardsIndex | null) => {
        const sub = index?.subjects?.[subjectSlug] ?? null;
        setIndexSubject(sub);
        setLoaded(true);
      })
      .catch(() => {
        setIndexSubject(null);
        setLoaded(true);
      });
  }, [subjectSlug]);

  const title = indexSubject?.title ?? subject?.title ?? "Subject";
  const coverImageUrl = indexSubject?.coverImageUrl ?? subject?.coverImageUrl ?? "";
  const slugForLinks = subjectSlug ?? subject?.slug ?? "";

  if (!subjectSlug) {
    navigate({ to: "/ib", replace: true });
    return null;
  }

  const mapFlashToNotesTopic = (t: FlashcardsIndexTopic): NotesIndexTopic => ({
    slug: t.slug,
    title: t.title,
    path: t.deckCount > 0 ? ["flashcards"] : undefined,
    children: (t.children ?? []).map(mapFlashToNotesTopic),
  });

  const topics: NotesIndexTopic[] = (indexSubject?.topics ?? []).map(mapFlashToNotesTopic);

  return (
    <div className="relative z-0 w-full">
      {coverImageUrl ? <SubjectBackground coverImageUrl={coverImageUrl} /> : null}
      <div className="relative z-10 md:max-w-xl mx-auto w-full px-4 lg:pt-12 sm:px-6 py-8 sm:pt-20 lg:px-8 lg:max-w-4xl">
        <nav aria-label="breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 break-words font-medium text-muted-foreground sm:gap-1.5">
            <li className="inline-flex max-w-[48em] items-center gap-1.5 truncate">
              <Link className="max-w-20 truncate transition-colors hover:text-foreground md:max-w-none" to="/ib">
                IB
              </Link>
            </li>
            <li aria-hidden="true" className="[&>svg]:size-5" role="presentation">
              <HiChevronRight aria-hidden className="size-5" />
            </li>
            <li className="inline-flex max-w-[48em] items-center gap-1.5 truncate">
              <span aria-current="page" aria-disabled="true" className="max-w-20 truncate font-medium text-foreground md:max-w-none" role="link">
                {title}
              </span>
            </li>
          </ol>
        </nav>
        <header className="mt-4 mb-6 flex items-center justify-between">
          <h1 className="font-manrope text-4xl font-bold tracking-tight">{title}</h1>
        </header>
        <div className="mb-6">
          <TopicModeTabs activeId="flashcards" />
        </div>
        <div>
          {!loaded ? (
            <p className="text-muted-foreground">Loading flashcards…</p>
          ) : (
            <SubjectAccordion subjectSlug={slugForLinks} topics={topics} mode="flashcards" />
          )}
        </div>
      </div>
    </div>
  );
}
