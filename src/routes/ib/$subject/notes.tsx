import { useState, useEffect, useMemo } from "react";
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { HiChevronRight } from "react-icons/hi";
import subjectsDataRaw from "@/data/ib-subjects.json";
import SubjectAccordion from "@/components/subject/SubjectAccordion";
import SubjectBackground from "@/components/subject/SubjectBackground";
import TopicModeTabs from "@/components/subject/TopicModeTabs";
import type { NotesIndexTopic } from "@/types/notesIndex";
import type { Subject } from "@/types/ib";
import { supabase } from "@/lib/supabase";

const subjectsData = subjectsDataRaw as Subject[];

export const Route = createFileRoute('/ib/$subject/notes')({
  component: NotesPage,
})

function NotesPage() {
  const { subject: subjectSlug } = useParams({ strict: false });
  const navigate = useNavigate();
  const subject = subjectsData.find((s) => s.slug === subjectSlug);
  const [subjectData, setSubjectData] = useState<any>(null);
  const [noteTopicSlugs, setNoteTopicSlugs] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!subjectSlug) { setSubjectData(null); setLoaded(false); return; }
    setLoaded(false);
    Promise.all([
      supabase.from("subjects").select("data").eq("slug", subjectSlug).single(),
      supabase.from("notes").select("topic_slug").eq("subject_slug", subjectSlug),
    ]).then(([{ data: subRow }, { data: noteRows }]) => {
      setSubjectData(subRow?.data ?? null);
      setNoteTopicSlugs(new Set((noteRows ?? []).map((r: any) => r.topic_slug).filter(Boolean)));
      setLoaded(true);
    }).catch(() => { setSubjectData(null); setLoaded(true); });
  }, [subjectSlug]);

  const title = subjectData?.title ?? subject?.title ?? "Subject";
  const coverImageUrl = subjectData?.coverImageUrl ?? subject?.coverImageUrl ?? "";
  const slugForLinks = subjectSlug ?? subject?.slug ?? "";

  const topics: NotesIndexTopic[] = useMemo(() => {
    if (!subjectData) return [];
    function build(t: any): NotesIndexTopic | null {
      const children = (t.childTopics ?? []).map(build).filter(Boolean) as NotesIndexTopic[];
      const hasNotes = noteTopicSlugs.has(t.slug);
      if (!hasNotes && children.length === 0) return null;
      return { slug: t.slug, title: t.title, path: hasNotes ? ["notes"] : undefined, children };
    }
    return (subjectData.topics ?? [])
      .filter((t: any) => !t.hidden)
      .sort((a: any, b: any) => a.order - b.order)
      .map(build)
      .filter(Boolean) as NotesIndexTopic[];
  }, [subjectData, noteTopicSlugs]);

  if (!subjectSlug) {
    navigate({ to: '/ib', replace: true });
    return null;
  }

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
        <header className="mt-4 mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold font-manrope">{title}</h1>
        </header>
        <div className="mb-6">
          <TopicModeTabs activeId="notes" />
        </div>
        <div>
          {!loaded ? (
            <p className="text-muted-foreground">Loading notes…</p>
          ) : (
            <SubjectAccordion subjectSlug={slugForLinks} topics={topics} />
          )}
        </div>
      </div>
    </div>
  );
}
