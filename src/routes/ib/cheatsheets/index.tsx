import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CentralIcon } from "@central-icons-react/all";
import { HiChevronRight } from "react-icons/hi";
import { PdfPreview } from "@/components/predictedpapers/PdfPreview";
import { centralIconPropsOutlined28 } from "@/lib/icon-props";
import { supabase } from "@/lib/supabase";

type CheatsheetRow = {
  id: string;
  title: string;
  is_premium: boolean;
  subject_slug: string | null;
  subject_title: string | null;
  thumbnail_url: string | null;
};

export const Route = createFileRoute("/ib/cheatsheets/")({
  component: CheatsheetsIndexPage,
});

function CheatsheetsIndexPage() {
  const [data, setData] = useState<CheatsheetRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("cheatsheets")
      .select("id, title, is_premium, subject_slug, subject_title, thumbnail_url")
      .order("subject_title")
      .order("title")
      .then(({ data: rows }) => setData(rows ?? null))
      .catch(() => setData(null));
  }, []);

  const { groupedBySubject, subjectTitles } = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return { groupedBySubject: {} as Record<string, CheatsheetRow[]>, subjectTitles: [] as string[] };
    }
    const grouped: Record<string, CheatsheetRow[]> = {};
    for (const c of data) {
      const s = c.subject_title ?? "";
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(c);
    }
    const subjectTitles = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
    return { groupedBySubject: grouped, subjectTitles };
  }, [data]);

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pt-12">
      <div className="flex flex-row items-center gap-4">
        <span className="rounded-2xl bg-lime-100 p-2 text-3xl text-lime-700 dark:bg-lime-400/25 dark:text-lime-300">
          <CentralIcon {...centralIconPropsOutlined28} name="IconSearchlinesSparkle" className="size-8" />
        </span>
        <h1 className="text-4xl font-bold font-manrope tracking-tight text-foreground">
          Cheatsheets
        </h1>
      </div>

      {data === null ? (
        <p className="text-muted-foreground">Loading cheatsheets…</p>
      ) : subjectTitles.length === 0 ? (
        <p className="text-muted-foreground">No cheatsheets available.</p>
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
                    to="/ib/$subject/cheatsheets"
                    params={{ subject: items[0].subject_slug ?? "" }}
                    className="inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 rounded-full px-4 py-2 ring-2 ring-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    View All
                    <HiChevronRight className="ml-1.5 size-5" aria-hidden />
                  </Link>
                </div>
                <div className="relative">
                  <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
                    {items.map((cheatsheet) => (
                      <PdfPreview
                        key={cheatsheet.id}
                        to="/ib/cheatsheets/$id"
                        params={{ id: cheatsheet.id }}
                        title={cheatsheet.title}
                        thumbnailSrc={cheatsheet.thumbnail_url ?? ""}
                        isPremium={cheatsheet.is_premium}
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
