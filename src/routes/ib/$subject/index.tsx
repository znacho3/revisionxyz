import { useState, useEffect } from "react";
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { HiChevronRight, HiInformationCircle } from "react-icons/hi";
import subjectsDataRaw from "@/data/ib-subjects.json";
import SubjectBackground from "@/components/subject/SubjectBackground";
import type { Subject } from "@/types/ib";
import { supabase } from "@/lib/supabase";

type SubjectTopic = { id: number; title: string; slug: string; order: number; hidden?: boolean; noteCount?: number; enableNotes?: boolean; childTopics?: SubjectTopic[], enableQuestions?: boolean; questionCount?: number; vocabularyPracticeCount?: number };
type SubjectDetail = { title: string; slug: string; coverImageUrl: string; questionCount: number; noteCount: number; flashcardDeckCount: number; cheatsheetCount: number; predictedPaperCount?: number; enableQuestions: boolean; enableNotes: boolean; enableFlashcards: boolean; enableGlossary: boolean; topics: SubjectTopic[] };

const subjectsData = subjectsDataRaw as Subject[];
const MODE_CARD_BASE = "https://assets.revisiondojo.com/assets/images/mode-cards";

function topicBoxCount(topic: SubjectTopic): number {
  const n = topic.childTopics?.length ?? 0;
  return n > 0 ? n : 1;
}

function ModeCardImg({ light, dark }: { light: string; dark: string }) {
  return (
    <>
      <img alt="" loading="lazy" width={240} height={240} decoding="async" className="mx-auto scale-125 object-contain dark:hidden" src={light} style={{ color: "transparent" }} />
      <img alt="" loading="lazy" width={240} height={240} decoding="async" className="mx-auto hidden scale-125 object-contain dark:block" src={dark} style={{ color: "transparent" }} />
    </>
  );
}

export const Route = createFileRoute('/ib/$subject/')({
  component: SubjectPage,
})

function SubjectPage() {
  const { subject: subjectSlug } = useParams({ strict: false });
  const navigate = useNavigate();
  const subject = subjectsData.find((s) => s.slug === subjectSlug);
  const [subjectDetail, setSubjectDetail] = useState<SubjectDetail | null>(null);
  const [hasQuestionbank, setHasQuestionbank] = useState(false);

  useEffect(() => {
    if (!subjectSlug) { setSubjectDetail(null); return; }
    supabase
      .from("subjects")
      .select("data")
      .eq("slug", subjectSlug)
      .single()
      .then(({ data: row }) => {
        const detail = row?.data as SubjectDetail | undefined;
        if (!detail) { navigate({ to: "/ib", replace: true }); return; }
        setSubjectDetail(detail);
      })
      .catch(() => { navigate({ to: "/ib", replace: true }); });
  }, [subjectSlug, navigate]);

  useEffect(() => {
    if (!subjectSlug) { setHasQuestionbank(false); return; }
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("subject_slug", subjectSlug)
      .then(({ count }) => setHasQuestionbank((count ?? 0) > 0))
      .catch(() => setHasQuestionbank(false));
  }, [subjectSlug]);

  const title = subjectDetail?.title ?? subject?.title ?? "Subject";
  const coverImageUrl = subjectDetail?.coverImageUrl ?? subject?.coverImageUrl ?? "";
  const slugForLinks = subjectSlug ?? subject?.slug ?? "";
  const topics = (subjectDetail?.topics ?? [])
    .filter(
      (t) =>
        !t.hidden &&
        (
          (t.enableNotes === true && (t.noteCount ?? 0) > 0) ||
          (t.enableQuestions === true && (t.questionCount ?? 0) > 0) ||
          (t.vocabularyPracticeCount ?? 0) > 0
        )
    )
    .sort((a, b) => a.order - b.order);

  if (!subjectSlug) return null;

  return (
    <div className="relative z-0 w-full">
      {coverImageUrl ? <SubjectBackground coverImageUrl={coverImageUrl} /> : null}
      <div className="relative z-10 md:max-w-xl mx-auto w-full px-4 lg:pt-12 sm:px-6 py-8 sm:pt-20 lg:px-8 lg:max-w-4xl">
        <nav aria-label="breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 break-words font-medium text-muted-foreground sm:gap-1.5">
            <li className="inline-flex max-w-[48em] items-center gap-1.5 truncate">
              <Link className="max-w-20 truncate transition-colors hover:text-foreground md:max-w-none" to="/ib">IB</Link>
            </li>
            <li aria-hidden="true" className="[&>svg]:size-5" role="presentation"><HiChevronRight aria-hidden className="size-5" /></li>
            <li className="inline-flex max-w-[48em] items-center gap-1.5 truncate">
              <span aria-current="page" aria-disabled="true" className="font-medium text-foreground max-w-20 truncate md:max-w-none" role="link">{title}</span>
            </li>
          </ol>
        </nav>
        <header className="mt-4 mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold font-manrope">{title}</h1>
        </header>
        <div className="mt-6 space-y-6">
          <div>
            {subjectDetail != null &&
            (hasQuestionbank ||
             subjectDetail.enableNotes && subjectDetail.noteCount > 0 ||
             subjectDetail.enableFlashcards && subjectDetail.flashcardDeckCount > 0 ||
             subjectDetail.cheatsheetCount > 0) ? (
              <>
                <h2 className="mb-2 font-semibold font-manrope text-2xl tracking-tight opacity-70">Practice</h2>
                <div className="grid gap-4 lg:grid-cols-2">
              {slugForLinks && hasQuestionbank && (
                <Link className="group relative" to="/ib/$subject/questionbank" params={{ subject: slugForLinks }}>
                  <div className="-ml-2 relative flex items-center gap-5 rounded-3xl p-2 transition-all hover:bg-muted">
                    <div className="relative h-28 w-28 shrink-0 rounded-2xl ring-2 ring-foreground/5 ring-inset bg-indigo-100 text-indigo-700 dark:bg-indigo-400/25 dark:text-indigo-300">
                      <div className="rounded-full opacity-100"><ModeCardImg light={`${MODE_CARD_BASE}/card-questionBank.png`} dark={`${MODE_CARD_BASE}/card-questionBank-dark.png`} /></div>
                    </div>
                    <div className="py-2">
                      <div className="flex items-center gap-2"><p className="flex items-center gap-2 text-pretty font-bold font-manrope text-xl leading-[1] tracking-tight">Questionbank</p></div>
                      <p className="mt-2 text-pretty leading-5 opacity-60">Practice questions by topic</p>
                    </div>
                  </div>
                </Link>
              )}
              {slugForLinks && subjectDetail != null && (subjectDetail.predictedPaperCount ?? 0) > 0 && (
                <Link className="group relative" to={`/ib/${slugForLinks}/predicted-papers` as '/'}>
                  <div className="-ml-2 relative flex items-center gap-5 rounded-3xl p-2 transition-all hover:bg-muted">
                    <div className="relative h-28 w-28 shrink-0 rounded-2xl ring-2 ring-foreground/5 ring-inset bg-red-100 text-red-700 dark:bg-red-400/25 dark:text-red-300">
                      <div className="rounded-full opacity-100"><ModeCardImg light={`${MODE_CARD_BASE}/card-predictedPaper.png`} dark={`${MODE_CARD_BASE}/card-predictedPaper-dark.png`} /></div>
                    </div>
                    <div className="py-2">
                      <div className="flex items-center gap-2"><p className="flex items-center gap-2 text-pretty font-bold font-manrope text-xl leading-[1] tracking-tight">Predicted Papers</p></div>
                      <p className="mt-2 text-pretty leading-5 opacity-60">Prediction exams for practice</p>
                      <p className="mt-2 text-sm opacity-40">{subjectDetail.predictedPaperCount} papers</p>
                    </div>
                  </div>
                </Link>
              )}
              {slugForLinks && subjectDetail != null && subjectDetail.enableNotes && subjectDetail.noteCount > 0 && (
                <Link className="group relative" to="/ib/$subject/notes" params={{ subject: slugForLinks }}>
                  <div className="-ml-2 relative flex items-center gap-5 rounded-3xl p-2 transition-all hover:bg-muted">
                    <div className="relative h-28 w-28 shrink-0 rounded-2xl ring-2 ring-foreground/5 ring-inset bg-yellow-100 text-yellow-700 dark:bg-yellow-400/25 dark:text-yellow-400">
                      <div className="rounded-full opacity-100"><ModeCardImg light={`${MODE_CARD_BASE}/card-textbook.png`} dark={`${MODE_CARD_BASE}/card-textbook-dark.png`} /></div>
                    </div>
                    <div className="py-2">
                      <div className="flex items-center gap-2"><p className="flex items-center gap-2 text-pretty font-bold font-manrope text-xl leading-[1] tracking-tight">Notes</p></div>
                      <p className="mt-2 text-pretty leading-5 opacity-60">Comprehensive notes with diagrams and examples</p>
                      <p className="mt-2 text-sm opacity-40">{subjectDetail.noteCount} chapters</p>
                    </div>
                  </div>
                </Link>
              )}
              {slugForLinks && subjectDetail != null && subjectDetail.enableFlashcards && subjectDetail.flashcardDeckCount > 0 && (
                <Link className="group relative" to="/ib/$subject/flashcards" params={{ subject: slugForLinks }}>
                  <div className="-ml-2 relative flex items-center gap-5 rounded-3xl p-2 transition-all hover:bg-muted">
                    <div className="relative h-28 w-28 shrink-0 rounded-2xl ring-2 ring-foreground/5 ring-inset bg-sky-100 text-sky-700 dark:bg-sky-400/25 dark:text-sky-300">
                      <div className="rounded-full opacity-100"><ModeCardImg light={`${MODE_CARD_BASE}/card-flashcards.png`} dark={`${MODE_CARD_BASE}/card-flashcards-dark.png`} /></div>
                    </div>
                    <div className="py-2">
                      <div className="flex items-center gap-2"><p className="flex items-center gap-2 text-pretty font-bold font-manrope text-xl leading-[1] tracking-tight">Flashcards</p></div>
                      <p className="mt-2 text-pretty leading-5 opacity-60">Learn key concepts with active recall</p>
                      <p className="mt-2 text-sm opacity-40">{subjectDetail.flashcardDeckCount} flashcard deck{subjectDetail.flashcardDeckCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </Link>
              )}
              {slugForLinks && subjectDetail != null && subjectDetail.cheatsheetCount > 0 && (
                <Link className="group relative" to={`/ib/${slugForLinks}/cheatsheets` as '/'}>
                  <div className="-ml-2 relative flex items-center gap-5 rounded-3xl p-2 transition-all hover:bg-muted">
                    <div className="relative h-28 w-28 shrink-0 rounded-2xl ring-2 ring-foreground/5 ring-inset bg-lime-100 text-lime-700 dark:bg-lime-400/25 dark:text-lime-300">
                      <div className="rounded-full opacity-100"><ModeCardImg light={`${MODE_CARD_BASE}/card-cheatsheet.png`} dark={`${MODE_CARD_BASE}/card-cheatsheet-dark.png`} /></div>
                    </div>
                    <div className="py-2">
                      <div className="flex items-center gap-2"><p className="flex items-center gap-2 text-pretty font-bold font-manrope text-xl leading-[1] tracking-tight">Cheatsheets</p></div>
                      <p className="mt-2 text-pretty leading-5 opacity-60">Chapter summaries, key concepts, and exam tips</p>
                      <p className="mt-2 text-sm opacity-40">{subjectDetail.cheatsheetCount} cheatsheets</p>
                    </div>
                  </div>
                </Link>
              )}
              {/* {slugForLinks && subjectDetail != null && subjectDetail.enableGlossary !== false && (
                <Link className="group relative" to={`/ib/${slugForLinks}/glossary` as '/'}>
                  <div className="-ml-2 relative flex items-center gap-5 rounded-3xl p-2 transition-all hover:bg-muted">
                    <div className="relative h-28 w-28 shrink-0 rounded-2xl ring-2 ring-foreground/5 ring-inset bg-pink-100 text-pink-700 dark:bg-pink-400/25 dark:text-pink-300">
                      <div className="rounded-full opacity-100"><ModeCardImg light={`${MODE_CARD_BASE}/card-glossary.png`} dark={`${MODE_CARD_BASE}/card-glossary-dark.png`} /></div>
                    </div>
                    <div className="py-2">
                      <div className="flex items-center gap-2"><p className="flex items-center gap-2 text-pretty font-bold font-manrope text-xl leading-[1] tracking-tight">Key Definitions</p></div>
                      <p className="mt-2 text-pretty leading-5 opacity-60">Essential terms and concepts explained</p>
                    </div>
                  </div>
                </Link>
              )} */}
                </div>
              </>
            ) : subjectDetail != null ? (
              <h2 className="mb-2 font-semibold font-manrope text-2xl tracking-tight opacity-70">No resources found. Check back in a week or so.</h2>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
