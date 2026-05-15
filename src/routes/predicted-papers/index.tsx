import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CentralIcon } from "@central-icons-react/all";
import { HiChevronRight } from "react-icons/hi";
import { PdfPreview } from "@/components/predictedpapers/PdfPreview";
import type { PredictedPaper } from "@/types/predictedpaper";
import { centralIconPropsOutlined28 } from "@/lib/icon-props";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/predicted-papers/")({
  component: PredictedPapersIndexPage,
});

function PredictedPapersIndexPage() {
  const [data, setData] = useState<PredictedPaper[] | null>(null);

  useEffect(() => {
    supabase
      .from("predicted_papers")
      .select("data")
      .then(({ data: rows }) => {
        const papers = (rows ?? []).map((r) => r.data as PredictedPaper);
        setData(papers.length > 0 ? papers : null);
      })
      .catch(() => setData(null));
  }, []);

  const { groupedBySubject, subjectTitles } = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return { groupedBySubject: {} as Record<string, PredictedPaper[]>, subjectTitles: [] as string[] };
    }
    const grouped: Record<string, PredictedPaper[]> = {};
    for (const p of data) {
      const s = p.subject.title;
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(p);
    }
    const subjectTitles = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
    return { groupedBySubject: grouped, subjectTitles };
  }, [data]);

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pt-12">
      <div className="flex flex-row items-center gap-4">
        <span className="rounded-2xl bg-red-100 p-2 text-3xl text-red-700 dark:bg-red-400/25 dark:text-red-300">
          <CentralIcon {...centralIconPropsOutlined28} name="IconFileEdit" className="size-8" />
        </span>
        <h1 className="text-4xl font-bold font-manrope tracking-tight text-foreground">
          Predicted Papers
        </h1>
      </div>

      {data === null ? (
        <p className="text-muted-foreground">Loading predicted papers…</p>
      ) : subjectTitles.length === 0 ? (
        <p className="text-muted-foreground">No predicted papers available.</p>
      ) : (
        <div className="space-y-10">
          {subjectTitles.map((subject) => {
            const items = groupedBySubject[subject] ?? [];
            if (items.length === 0) return null;
            return (
              <section key={subject} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold font-manrope text-foreground tracking-tight">
                    {subject}
                  </h2>
                  <Link
                    to="/ib/$subject/predicted-papers"
                    params={{ subject: items[0].subject.slug.current }}
                    className="inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 rounded-full px-4 py-2 ring-2 ring-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    View All
                    <HiChevronRight className="ml-1.5 size-5" aria-hidden />
                  </Link>
                </div>
                <div className="relative">
                  <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
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
                  <div
                    className="pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-12 bg-gradient-to-l from-background to-transparent"
                    aria-hidden
                  />
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
