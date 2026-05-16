import { useState, useEffect } from "react";
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { HiChevronRight } from "react-icons/hi";
import subjectsDataRaw from "@/data/ib-subjects.json";
import SubjectBackground from "@/components/subject/SubjectBackground";
import TopicModeTabs from "@/components/subject/TopicModeTabs";
import { PdfPreview } from "@/components/predictedpapers/PdfPreview";
import type { Subject } from "@/types/ib";
import { supabase } from "@/lib/supabase";

const subjectsData = subjectsDataRaw as Subject[];

type CheatsheetRow = {
  id: string;
  title: string;
  is_premium: boolean;
  subject_slug: string | null;
  subject_title: string | null;
  thumbnail_url: string | null;
};

export const Route = createFileRoute("/ib/$subject/cheatsheets")({
  component: SubjectCheatsheetsPage,
});

function SubjectCheatsheetsPage() {
  const { subject: subjectSlug } = useParams({ strict: false });
  const navigate = useNavigate();
  const subject = subjectsData.find((s) => s.slug === subjectSlug);
  const [cheatsheets, setCheatsheets] = useState<CheatsheetRow[] | null>(null);

  useEffect(() => {
    if (!subjectSlug) { setCheatsheets(null); return; }
    supabase
      .from("cheatsheets")
      .select("id, title, is_premium, subject_slug, subject_title, thumbnail_url")
      .eq("subject_slug", subjectSlug)
      .order("title")
      .then(({ data: rows }) => setCheatsheets(rows ?? []))
      .catch(() => setCheatsheets([]));
  }, [subjectSlug]);

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
        ) : cheatsheets.length === 0 ? (
          <p className="text-muted-foreground">No cheatsheets available for this subject.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {cheatsheets.map((cheatsheet) => (
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
        )}
      </div>
    </div>
  );
}
