import { useState, useEffect, useMemo } from "react";
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { HiChevronRight } from "react-icons/hi";
import subjectsDataRaw from "@/data/ib-subjects.json";
import SubjectBackground from "@/components/subject/SubjectBackground";
import TopicModeTabs from "@/components/subject/TopicModeTabs";
import { PdfPreview } from "@/components/predictedpapers/PdfPreview";
import type { Cheatsheet } from "@/types/cheatsheet";
import type { Subject } from "@/types/ib";

const subjectsData = subjectsDataRaw as Subject[];

export const Route = createFileRoute("/ib/$subject/cheatsheets")({
  component: SubjectCheatsheetsPage,
});

function SubjectCheatsheetsPage() {
  const { subject: subjectSlug } = useParams({ strict: false });
  const navigate = useNavigate();
  const subject = subjectsData.find((s) => s.slug === subjectSlug);
  const [cheatsheets, setCheatsheets] = useState<Cheatsheet[] | null>(null);

  useEffect(() => {
    if (!subjectSlug) {
      setCheatsheets(null);
      return;
    }
    fetch("/cheatsheet_info.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: Cheatsheet[] | null) => {
        if (!Array.isArray(json)) {
          setCheatsheets([]);
          return;
        }
        const forSubject = json.filter((c) => c.subjectSlug === subjectSlug);
        setCheatsheets(forSubject);
      })
      .catch(() => setCheatsheets([]));
  }, [subjectSlug]);

  const title = subject?.title ?? "Subject";
  const coverImageUrl = subject?.coverImageUrl ?? "";

  const groupedByTopic = useMemo(() => {
    if (!cheatsheets || cheatsheets.length === 0) return [] as { topicTitle: string; items: Cheatsheet[] }[];
    const byTopic = new Map<string, { items: Cheatsheet[]; parentTopicId: number | null }>();
    for (const c of cheatsheets) {
      const topic = c.parentTopicTitle || c.topicTitle || "Other";
      if (!byTopic.has(topic)) {
        byTopic.set(topic, { items: [], parentTopicId: c.parentTopicId ?? null });
      }
      byTopic.get(topic)!.items.push(c);
    }
    return Array.from(byTopic.entries())
      .map(([topicTitle, value]) => ({ topicTitle, ...value }))
      .sort((a, b) => {
        if (a.parentTopicId != null && b.parentTopicId != null && a.parentTopicId !== b.parentTopicId) {
          return a.parentTopicId - b.parentTopicId;
        }
        return a.topicTitle.localeCompare(b.topicTitle);
      });
  }, [cheatsheets]);

  if (!subjectSlug) {
    navigate({ to: "/ib", replace: true });
    return null;
  }

  return (
    <div className="relative z-0 w-full">
      {coverImageUrl ? <SubjectBackground coverImageUrl={coverImageUrl} /> : null}
      <div className="relative z-10 md:max-w-xl mx-auto w-full px-4 lg:pt-12 sm:px-6 py-8 sm:pt-20 lg:px-8 lg:max-w-4xl">
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
              <Link className="max-w-20 truncate transition-colors hover:text-foreground md:max-w-none" to="/ib/$subject" params={{ subject: subjectSlug }}>
                {title}
              </Link>
            </li>
            <li aria-hidden="true" className="[&>svg]:size-5" role="presentation">
              <HiChevronRight aria-hidden className="size-5" />
            </li>
            <li className="inline-flex max-w-[48em] items-center gap-1.5 truncate">
              <span aria-current="page" className="font-medium text-foreground max-w-20 truncate md:max-w-none" role="link">
                Cheatsheets
              </span>
            </li>
          </ol>
        </nav>
        <header className="mt-4 mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold font-manrope">{title}</h1>
        </header>
        <div className="mb-8">
          <TopicModeTabs activeId="cheatsheets" />
        </div>
        {cheatsheets === null ? (
          <p className="text-muted-foreground">Loading cheatsheets…</p>
        ) : groupedByTopic.length === 0 ? (
          <p className="text-muted-foreground">No cheatsheets available for this subject.</p>
        ) : (
          <div className="relative isolate space-y-8">
            {groupedByTopic.map(({ topicTitle, items }) => (
              <section key={topicTitle} className="space-y-4">
                <h2 className="text-2xl font-bold font-manrope text-foreground tracking-tight">{topicTitle}</h2>
                <div className="grid grid-cols-2 gap-x-3 gap-y-6 grid-cols-3 lg:grid-cols-4">
                  {items.map((cheatsheet) => (
                    <PdfPreview
                      key={cheatsheet.id}
                      to="/ib/cheatsheets/$id"
                      params={{ id: cheatsheet.id }}
                      title={cheatsheet.title}
                      thumbnailSrc={`/cheatsheets/${cheatsheet.thumbnailR2Key}`}
                      isPremium={cheatsheet.isPremium}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
