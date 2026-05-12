import { useState, useEffect, useMemo } from "react";
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { HiChevronRight } from "react-icons/hi";
import subjectsDataRaw from "@/data/ib-subjects.json";
import SubjectBackground from "@/components/subject/SubjectBackground";
import TopicModeTabs from "@/components/subject/TopicModeTabs";
import { PdfPreview } from "@/components/predictedpapers/PdfPreview";
import type { PredictedPaper } from "@/types/predictedpaper";
import type { Subject } from "@/types/ib";

const subjectsData = subjectsDataRaw as Subject[];

const LEVEL_ORDER = ["hl", "sl", "both"] as const;
const LEVEL_LABELS: Record<string, string> = {
  hl: "Higher Level (HL)",
  sl: "Standard Level (SL)",
  both: "Both SL & HL",
};

export const Route = createFileRoute("/ib/$subject/predicted-papers")({
  component: SubjectPredictedPapersPage,
});

function SubjectPredictedPapersPage() {
  const { subject: subjectSlug } = useParams({ strict: false });
  const navigate = useNavigate();
  const subject = subjectsData.find((s) => s.slug === subjectSlug);
  const [papers, setPapers] = useState<PredictedPaper[] | null>(null);

  useEffect(() => {
    if (!subjectSlug) {
      setPapers(null);
      return;
    }
    fetch("/predictedpapers_info.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: PredictedPaper[] | null) => {
        if (!Array.isArray(json)) {
          setPapers([]);
          return;
        }
        setPapers(json.filter((p) => p.subject.slug.current === subjectSlug));
      })
      .catch(() => setPapers([]));
  }, [subjectSlug]);

  const groupedByLevel = useMemo(() => {
    if (!papers || papers.length === 0) return [];
    const byLevel = new Map<string, PredictedPaper[]>();
    for (const p of papers) {
      const lvl = p.level;
      if (!byLevel.has(lvl)) byLevel.set(lvl, []);
      byLevel.get(lvl)!.push(p);
    }
    return LEVEL_ORDER.filter((lvl) => byLevel.has(lvl)).map((lvl) => ({
      level: lvl,
      label: LEVEL_LABELS[lvl] ?? lvl.toUpperCase(),
      items: byLevel.get(lvl)!,
    }));
  }, [papers]);

  const title = subject?.title ?? "Subject";
  const coverImageUrl = subject?.coverImageUrl ?? "";

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
                Predicted Papers
              </span>
            </li>
          </ol>
        </nav>
        <header className="mt-4 mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold font-manrope">{title}</h1>
        </header>
        <div className="mb-8">
          <TopicModeTabs activeId="predicted-papers" />
        </div>
        {papers === null ? (
          <p className="text-muted-foreground">Loading predicted papers…</p>
        ) : groupedByLevel.length === 0 ? (
          <p className="text-muted-foreground">No predicted papers available for this subject.</p>
        ) : (
          <div className="relative isolate space-y-8">
            {groupedByLevel.map(({ level, label, items }) => (
              <section key={level} className="space-y-4">
                <h2 className="text-2xl font-bold font-manrope text-foreground tracking-tight">{label}</h2>
                <div className="grid grid-cols-2 gap-x-3 gap-y-6 grid-cols-3 lg:grid-cols-4">
                  {items.map((paper) => (
                    <PdfPreview
                      key={paper._id}
                      to="/predicted-papers/$subjectSlug/$paperSlug"
                      params={{
                        subjectSlug: paper.subject.slug.current,
                        paperSlug: paper.slug.current,
                      }}
                      title={paper.title}
                      thumbnailSrc={paper.thumbnail}
                      isPremium={paper.premium}
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
