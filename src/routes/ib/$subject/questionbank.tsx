import { useState, useEffect, useMemo } from "react";
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { HiChevronRight } from "react-icons/hi";
import subjectsDataRaw from "@/data/ib-subjects.json";
import SubjectBackground from "@/components/subject/SubjectBackground";
import TopicModeTabs from "@/components/subject/TopicModeTabs";
import SubjectAccordion from "@/components/subject/SubjectAccordion";
import type { NotesIndexTopic } from "@/types/notesIndex";
import type { Subject } from "@/types/ib";
import "@/questionbank.css";

const subjectsData = subjectsDataRaw as Subject[];

type QuestionbankIndexEntry = {
  subjectSlug: string;
  parentTopicSlug: string;
  childTopicSlug: string;
  path: string;
};

type QuestionbankIndex = { entries: QuestionbankIndexEntry[] };

type SubjectTopic = {
  slug: string;
  title: string;
  childTopics?: { slug: string; title: string }[];
};

type SubjectDetail = {
  title: string;
  topics?: SubjectTopic[];
};

export const Route = createFileRoute("/ib/$subject/questionbank")({
  component: SubjectQuestionbankPage,
});

function SubjectQuestionbankPage() {
  const { subject: subjectSlug } = useParams({ strict: false });
  const navigate = useNavigate();
  const subject = subjectsData.find((s) => s.slug === subjectSlug);
  const [index, setIndex] = useState<QuestionbankIndex | null>(null);
  const [subjectDetail, setSubjectDetail] = useState<SubjectDetail | null>(null);

  useEffect(() => {
    if (!subjectSlug) {
      setIndex(null);
      setSubjectDetail(null);
      return;
    }
    fetch("/questionbank-index.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: QuestionbankIndex | null) => setIndex(data ?? null))
      .catch(() => setIndex(null));
  }, [subjectSlug]);

  useEffect(() => {
    if (!subjectSlug) return;
    fetch(`/subjects/${subjectSlug}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { result?: { data?: { json?: SubjectDetail[] } } }) => {
        const detail = data?.result?.data?.json?.[0];
        setSubjectDetail(detail ?? null);
      })
      .catch(() => setSubjectDetail(null));
  }, [subjectSlug]);

  const title = subjectDetail?.title ?? subject?.title ?? "Subject";
  const coverImageUrl = subject?.coverImageUrl ?? "";
  const slugForLinks = subjectSlug ?? subject?.slug ?? "";

  /** Index entries for this subject */
  const entries = useMemo(
    () => (index?.entries ?? []).filter((e) => e.subjectSlug === subjectSlug),
    [index?.entries, subjectSlug]
  );

  /** Child topic slugs that have a questionbank (for hierarchical subjects: parent -> children) */
  const questionbankChildSlugs = useMemo(() => new Set(entries.map((e) => e.childTopicSlug)), [entries]);

  /** Top-level topic slugs that have a questionbank (parentTopicSlug empty – flat subjects like Chinese) */
  const topLevelQuestionbankSlugs = useMemo(
    () => new Set(entries.filter((e) => !e.parentTopicSlug).map((e) => e.childTopicSlug)),
    [entries]
  );

  /** Build accordion tree from subject JSON: only topics/subtopics that have questionbank entries, with titles from subject JSON */
  const topics: NotesIndexTopic[] = useMemo(() => {
    const detail = subjectDetail;
    if (!detail?.topics?.length) return [];
    if (questionbankChildSlugs.size === 0 && topLevelQuestionbankSlugs.size === 0) return [];

    const result: NotesIndexTopic[] = [];

    for (const topic of detail.topics) {
      const childTopics = topic.childTopics ?? [];

      if (topLevelQuestionbankSlugs.has(topic.slug)) {
        result.push({
          slug: topic.slug,
          title: topic.title,
          path: ["questionbank"] as const,
          children: [] as NotesIndexTopic[],
        });
        continue;
      }

      const childrenWithQuestionbank = childTopics
        .filter((c) => questionbankChildSlugs.has(c.slug))
        .sort((a, b) => a.slug.localeCompare(b.slug))
        .map((c) => ({
          slug: c.slug,
          title: c.title,
          path: ["questionbank"] as const,
          children: [] as NotesIndexTopic[],
        }));

      if (childrenWithQuestionbank.length === 0) continue;

      result.push({
        slug: topic.slug,
        title: topic.title,
        children: childrenWithQuestionbank,
      });
    }

    return result;
  }, [subjectDetail, questionbankChildSlugs, topLevelQuestionbankSlugs]);

  if (!subjectSlug) {
    navigate({ to: "/ib", replace: true });
    return null;
  }

  return (
    <div className="relative z-0 w-full">
      {coverImageUrl ? <SubjectBackground coverImageUrl={coverImageUrl} /> : null}
      <div className="questionbank-page relative z-10 md:max-w-xl mx-auto w-full px-4 lg:pt-12 sm:px-6 py-8 sm:pt-20 lg:px-8 lg:max-w-4xl">
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
              <Link className="max-w-20 truncate transition-colors hover:text-foreground md:max-w-none" to="/ib/$subject" params={{ subject: slugForLinks }}>
                {title}
              </Link>
            </li>
            <li aria-hidden="true" className="[&>svg]:size-5" role="presentation">
              <HiChevronRight aria-hidden className="size-5" />
            </li>
            <li className="inline-flex max-w-[48em] items-center gap-1.5 truncate">
              <span aria-current="page" className="font-medium text-foreground max-w-20 truncate md:max-w-none" role="link">
                Questionbank
              </span>
            </li>
          </ol>
        </nav>
        <header className="mt-4 mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold font-manrope">{title}</h1>
        </header>
        <div className="mb-6">
          <TopicModeTabs activeId="questionbank" />
        </div>
        <div>
          {!index ? (
            <p className="text-muted-foreground">Loading questionbank…</p>
          ) : topics.length === 0 ? (
            <p className="text-muted-foreground">No questionbank available for this subject yet.</p>
          ) : (
            <SubjectAccordion subjectSlug={slugForLinks} topics={topics} mode="questionbank" />
          )}
        </div>
      </div>
    </div>
  );
}
