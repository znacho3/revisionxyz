import { useEffect, useState } from "react";
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { HiChevronRight } from "react-icons/hi";
import subjectsDataRaw from "@/data/ib-subjects.json";
import SubjectBackground from "@/components/subject/SubjectBackground";
import TopicModeTabs from "@/components/subject/TopicModeTabs";
import FlashcardViewer, { type FlashcardItem } from "@/components/flashcards/FlashcardViewer";
import FlashcardContent from "@/components/flashcards/FlashcardContent";
import { findTopicInFlashcardsTree, collectLeafTopics, type FlashcardsIndex, type FlashcardsIndexTopic } from "@/types/flashcardsIndex";
import { findTopicInNotesTree, type NotesIndex } from "@/types/notesIndex";
import type { Subject } from "@/types/ib";

const subjectsData = subjectsDataRaw as Subject[];

type FlashcardDeck = {
  topicId: number;
  id: string;
  title: string;
  flashcards: Array<{ id: string; front: string; back: string; cardType?: string }>;
};

export const Route = createFileRoute('/ib/$subject/$topicslug/flashcards')({
  component: TopicFlashcardsPage,
})

function TopicFlashcardsPage() {
  const { subject: subjectSlug, topicslug } = useParams({ strict: false });
  const navigate = useNavigate();
  const subject = subjectsData.find((s) => s.slug === subjectSlug);
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [topicTitle, setTopicTitle] = useState<string>("");
  const [subjectTitle, setSubjectTitle] = useState<string>("");
  const [coverImageUrl, setCoverImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [prevTopic, setPrevTopic] = useState<FlashcardsIndexTopic | null>(null);
  const [nextTopic, setNextTopic] = useState<FlashcardsIndexTopic | null>(null);

  useEffect(() => {
    if (!subjectSlug || !topicslug) {
      navigate({ to: "/ib", replace: true });
      return;
    }
    setLoading(true);
    setError(false);
    setDeck(null);

    Promise.all([
      fetch("/flashcards-index.json").then((r) => (r.ok ? r.json() : null)),
      fetch("/notes-index.json").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([flashIndex, notesIndex]: [FlashcardsIndex | null, NotesIndex | null]) => {
        const flashSub = flashIndex?.subjects?.[subjectSlug];
        if (!flashSub) {
          setError(true);
          setLoading(false);
          return;
        }

        const notesSub = notesIndex?.subjects?.[subjectSlug] ?? null;
        if (notesSub) {
          setSubjectTitle(notesSub.title);
          if (notesSub.coverImageUrl) setCoverImageUrl(notesSub.coverImageUrl);
        } else {
          setSubjectTitle(flashSub.title);
          setCoverImageUrl(flashSub.coverImageUrl ?? "");
        }

        const flashTopic = findTopicInFlashcardsTree(flashSub.topics, topicslug);
        if (!flashTopic || flashTopic.deckCount === 0) {
          setError(true);
          setLoading(false);
          return;
        }

        const leafTopics = collectLeafTopics(flashSub.topics);
        const currentIndex = leafTopics.findIndex((t) => t.id === flashTopic.id);
        setPrevTopic(currentIndex > 0 ? leafTopics[currentIndex - 1] : null);
        setNextTopic(currentIndex >= 0 && currentIndex < leafTopics.length - 1 ? leafTopics[currentIndex + 1] : null);

        let title = flashTopic.title;
        if (notesSub) {
          const notesTopic = findTopicInNotesTree(notesSub.topics, topicslug);
          if (notesTopic?.title) title = notesTopic.title;
        }
        setTopicTitle(title);

        return fetch(`/flashcards/${subjectSlug}.json`)
          .then((r) => (r.ok ? r.json() : null))
          .then((decks: FlashcardDeck[] | null) => {
            if (!Array.isArray(decks)) {
              setError(true);
              setLoading(false);
              return;
            }
            const found = decks.find((d) => d.topicId === flashTopic.id);
            if (!found) {
              setError(true);
              setLoading(false);
              return;
            }
            setDeck(found);
            setLoading(false);
          });
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [subjectSlug, topicslug, navigate]);

  if (!subjectSlug || !topicslug) return null;

  const slugForLinks = subjectSlug ?? subject?.slug ?? "";

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <p className="text-muted-foreground">Deck not found.</p>
        <Link to="/ib/$subject/flashcards" params={{ subject: slugForLinks }} className="mt-4 inline-block text-foreground underline hover:no-underline">
          ← Back to {subjectTitle || subject?.title || "subject"} flashcards
        </Link>
      </div>
    );
  }

  const cards: FlashcardItem[] = deck?.flashcards?.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    cardType: c.cardType,
  })) ?? [];

  return (
    <div className="relative z-0 w-full">
      {coverImageUrl ? <SubjectBackground coverImageUrl={coverImageUrl} /> : null}
      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:pt-20 lg:px-8 lg:pt-12">
        <nav aria-label="breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 break-words font-medium text-muted-foreground">
            <li>
              <Link className="transition-colors hover:text-foreground" to="/ib">
                IB
              </Link>
            </li>
            <li aria-hidden className="[&>svg]:size-5" role="presentation">
              <HiChevronRight aria-hidden className="size-5" />
            </li>
            <li>
              <Link className="transition-colors hover:text-foreground" to="/ib/$subject/flashcards" params={{ subject: slugForLinks }}>
                {subjectTitle || subject?.title || "Subject"}
              </Link>
            </li>
            <li aria-hidden className="[&>svg]:size-5" role="presentation">
              <HiChevronRight aria-hidden className="size-5" />
            </li>
            <li aria-current="page" className="font-medium text-foreground">
              {topicTitle || "Flashcards"}
            </li>
          </ol>
        </nav>
        <header className="mt-4 mb-6">
          <h1 className="font-manrope text-4xl font-bold tracking-tight">{topicTitle || "Flashcards"}</h1>
        </header>
        <div className="mb-6">
          <TopicModeTabs activeId="flashcards" />
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading deck…</p>
        ) : (
          <>
            <FlashcardViewer cards={cards} title={deck?.title ?? topicTitle} />

            {(prevTopic || nextTopic) && (
              <section className="my-16 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="flex flex-1 flex-col items-start">
                  <button
                    type="button"
                    className="inline-flex w-full items-start gap-2 rounded-2xl ring-2 ring-inset ring-foreground/10 p-4 font-medium text-muted-foreground ring-offset-background transition-all hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!prevTopic}
                  >
                    <HiChevronRight aria-hidden className="mt-0.5 text-2xl opacity-60 rotate-180" />
                    <div className="flex-1 text-left">
                      <p className="text-lg font-medium text-foreground">Previous</p>
                      <p className="truncate-2 font-medium text-muted-foreground">
                        {prevTopic ? prevTopic.title : "No previous topic"}
                      </p>
                    </div>
                  </button>
                </div>
                <div className="flex flex-1 flex-col items-end">
                  {nextTopic ? (
                    <Link
                      className="block h-full w-full"
                      to="/ib/$subject/$topicslug/flashcards"
                      params={{ subject: slugForLinks, topicslug: nextTopic.slug }}
                    >
                      <button
                        type="button"
                        className="inline-flex h-full w-full items-start gap-2 rounded-2xl p-4 font-medium text-muted-foreground ring-2 ring-inset ring-foreground/10 ring-offset-background transition-all hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
                      >
                        <div className="flex-1 text-right">
                          <p className="text-lg font-medium text-foreground">Next</p>
                          <p className="truncate-2 font-medium text-muted-foreground">
                            {nextTopic.title}
                          </p>
                        </div>
                        <HiChevronRight aria-hidden className="mt-0.5 text-2xl opacity-60" />
                      </button>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex h-full w-full items-start gap-2 rounded-2xl p-4 font-medium text-muted-foreground ring-2 ring-inset ring-foreground/10 ring-offset-background transition-all hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled
                    >
                      <div className="flex-1 text-right">
                        <p className="text-lg font-medium text-foreground">Next</p>
                        <p className="truncate-2 font-medium text-muted-foreground">No next topic</p>
                      </div>
                    </button>
                  )}
                </div>
              </section>
            )}

            <section className="mt-24">
              <div className="mb-2 flex flex-wrap items-center">
                <h2 className="text-3xl font-bold font-manrope tracking-tight">All flashcards</h2>
              </div>

              <div className="mt-8 grid gap-y-4">
                {cards.map((card) => (
                  <div key={card.id} className="group relative">
                    <div className="rounded-2xl bg-muted">
                      <div className="flex w-full flex-col md:flex-row">
                        <div
                          className="min-h-[120px] w-full px-4 py-3"
                          style={{ maxHeight: 250, overflow: "hidden auto", overscrollBehavior: "auto" }}
                        >
                          <FlashcardContent text={card.front} className="text-lg" segmentKeyPrefix={`all-f-${card.id}`} />
                        </div>
                        <div className="inset-x-0 h-0.5 flex-none bg-background md:inset-y-0 md:h-auto md:w-0.5" />
                        <div
                          className="min-h-[120px] w-full px-4 py-3"
                          style={{ maxHeight: 250, overflow: "hidden auto", overscrollBehavior: "auto" }}
                        >
                          <FlashcardContent text={card.back} className="text-lg" segmentKeyPrefix={`all-b-${card.id}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
