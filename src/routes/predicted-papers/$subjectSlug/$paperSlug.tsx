import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import { HiChevronLeft } from "react-icons/hi";
import { BiMinus, BiPlus } from "react-icons/bi";
import { CentralIcon } from "@central-icons-react/all";
import { centralIconProps } from "@/lib/icon-props";
import { cn } from "@/lib/utils";
import type { PredictedPaper } from "@/types/predictedpaper";
import { supabase } from "@/lib/supabase";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";

export const Route = createFileRoute("/predicted-papers/$subjectSlug/$paperSlug")({
  component: PredictedPaperDetailPage,
});

const PDF_WORKER_URL = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

function findQuestionPaperPair(
  all: PredictedPaper[],
  current: PredictedPaper,
): { questionPaper: PredictedPaper | null; markscheme: PredictedPaper | null } {
  const subject = current.subject.slug.current;
  if (current.questionPaper === null) {
    const ms =
      all.find(
        (p) =>
          p.subject.slug.current === subject &&
          p.questionPaper?._id === current._id,
      ) ?? null;
    return { questionPaper: current, markscheme: ms };
  }
  const qp = all.find((p) => p._id === current.questionPaper!._id) ?? null;
  return { questionPaper: qp, markscheme: current };
}

function PredictedPaperDetailPage() {
  const { subjectSlug, paperSlug } = useParams({ strict: false });
  const navigate = useNavigate();
  const [papers, setPapers] = useState<PredictedPaper[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [tabOverride, setTabOverride] = useState<"question" | "markscheme" | null>(null);

  const zoomPluginInstance = zoomPlugin();
  const { CurrentScale, zoomTo } = zoomPluginInstance;

  const paper = useMemo(() => {
    if (!papers || !subjectSlug || !paperSlug) return null;
    return (
      papers.find(
        (p) =>
          p.subject.slug.current === subjectSlug &&
          p.slug.current === paperSlug,
      ) ?? null
    );
  }, [papers, subjectSlug, paperSlug]);

  const pair = useMemo(() => {
    if (!paper || !papers) return { questionPaper: null as PredictedPaper | null, markscheme: null as PredictedPaper | null };
    return findQuestionPaperPair(papers, paper);
  }, [paper, papers]);

  const hasBothTabs = Boolean(pair.questionPaper && pair.markscheme);

  const activeTab = useMemo(() => {
    if (!paper) return "question" as const;
    if (tabOverride !== null) return tabOverride;
    return paper.questionPaper ? ("markscheme" as const) : ("question" as const);
  }, [paper, tabOverride]);

  const viewerPaper = useMemo(() => {
    if (!paper) return null;
    if (hasBothTabs) {
      return activeTab === "question" ? pair.questionPaper! : pair.markscheme!;
    }
    return pair.questionPaper ?? pair.markscheme ?? paper;
  }, [paper, pair, hasBothTabs, activeTab]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("predicted_papers")
      .select("data")
      .then(({ data: rows }) => {
        if (cancelled) return;
        const papers = (rows ?? []).map((r) => r.data as PredictedPaper);
        setPapers(papers.length > 0 ? papers : null);
      })
      .catch(() => {
        if (!cancelled) setPapers(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setTabOverride(null);
  }, [paper?._id]);

  useEffect(() => {
    setPdfLoaded(false);
  }, [viewerPaper?.slug.current]);

  useEffect(() => {
    if (!loading && !paper) {
      navigate({ to: "/predicted-papers" });
    }
  }, [loading, paper, navigate]);

  useEffect(() => {
    if (pdfLoaded && viewerPaper && typeof window !== "undefined" && window.innerWidth >= 1024) {
      zoomTo(1.5);
    }
  }, [pdfLoaded, viewerPaper, zoomTo]);

  const handleDownload = () => {
    if (!viewerPaper) return;
    const pdfUrl = `https://dl.pirateib.sh/Revision%20Dojo%20Archive/predictedpapers/${viewerPaper.slug.current}.pdf`;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `${viewerPaper.title.trim().replace(/[^a-z0-9-_]/gi, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center">
        <p className="text-muted-foreground">Loading predicted paper…</p>
      </div>
    );
  }

  if (!paper || !viewerPaper) return null;

  const pdfUrl = `https://dl.pirateib.sh/Revision%20Dojo%20Archive/predictedpapers/${viewerPaper.slug.current}.pdf`;

  return (
    <div className="flex h-full min-h-0 w-full flex-col lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col border-border lg:border-r">
        {hasBothTabs ? (
          <nav
            className="flex shrink-0 select-none border-b-2 border-border px-1 text-sm"
            aria-label="Paper type"
          >
            <button
              type="button"
              onClick={() => setTabOverride("question")}
              className={cn(
                "group -mb-[2px] flex items-center whitespace-nowrap border-b-2 px-0.5 pt-2 pb-1 font-medium transition-all",
                activeTab === "question"
                  ? "border-accent-primary-foreground text-accent-primary-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 transition-colors group-hover:bg-foreground/5">
                <CentralIcon
                  {...centralIconProps}
                  name="IconFileText"
                  size={20}
                  className={cn(
                    "size-5 shrink-0",
                    activeTab === "question" ? "text-accent-primary-foreground" : "opacity-60",
                  )}
                  ariaHidden
                />
                Question Paper
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTabOverride("markscheme")}
              className={cn(
                "group -mb-[2px] flex items-center whitespace-nowrap border-b-2 px-0.5 pt-2 pb-1 font-medium transition-all",
                activeTab === "markscheme"
                  ? "border-accent-primary-foreground text-accent-primary-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 transition-colors group-hover:bg-foreground/5">
                <CentralIcon
                  {...centralIconProps}
                  name="IconSquareChecklist"
                  size={20}
                  className={cn(
                    "size-5 shrink-0",
                    activeTab === "markscheme" ? "text-accent-primary-foreground" : "opacity-60",
                  )}
                  ariaHidden
                />
                Markscheme
              </span>
            </button>
          </nav>
        ) : null}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1">
            <CurrentScale>
              {(props: { scale?: number }) => {
                const scale = props.scale ?? 1;
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => zoomTo(Math.max(0.5, scale - 0.25))}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
                      title="Zoom out"
                    >
                      <BiMinus className="size-4" aria-hidden />
                    </button>
                    <span className="min-w-[3rem] text-center text-sm font-medium text-foreground">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => zoomTo(Math.min(3, scale + 0.25))}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
                      title="Zoom in"
                    >
                      <BiPlus className="size-4" aria-hidden />
                    </button>
                  </>
                );
              }}
            </CurrentScale>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
            title="Download PDF"
          >
            <CentralIcon {...centralIconProps} name="IconArrowInbox" size={16} className="size-4" ariaHidden />
          </button>
        </div>
        <div className="h-full min-h-0 flex-1 overflow-auto bg-muted/30">
          <Worker workerUrl={PDF_WORKER_URL}>
            <Viewer
              key={viewerPaper.slug.current}
              fileUrl={pdfUrl}
              plugins={[zoomPluginInstance]}
              onDocumentLoad={() => setPdfLoaded(true)}
            />
          </Worker>
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col border-t border-border bg-background lg:w-[360px] lg:max-w-[28rem] lg:border-t-0 lg:border-l">
        <div className="flex flex-col overflow-y-auto p-4 sm:p-6">
          <Link
            to="/predicted-papers"
            className="mb-4 hidden items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            <HiChevronLeft className="size-5" aria-hidden />
            Back to Predicted Papers
          </Link>
          <h1 className="font-manrope text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            {paper.title.trim()}
          </h1>
          <button
            type="button"
            onClick={handleDownload}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-2 font-medium text-background ring-offset-background transition-all hover:bg-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <CentralIcon {...centralIconProps} name="IconArrowInbox" size={24} className="size-6 opacity-60" ariaHidden />
            Download PDF
          </button>

          <div className="mt-6 space-y-1.5">
            <h3 className="text-base font-semibold text-foreground">Details</h3>
            <dl className="space-y-1 text-sm leading-snug">
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-muted-foreground">Subject</dt>
                <dd className="min-w-0 text-right font-medium text-foreground">{paper.subject.title}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-muted-foreground">Exam Session</dt>
                <dd className="font-medium text-foreground">{paper.examYear}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-muted-foreground">Level</dt>
                <dd className="font-medium text-foreground uppercase">{paper.level}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-muted-foreground">Paper Type</dt>
                <dd className="min-w-0 text-right font-medium text-foreground">{paper.paperType.replace(/^ib-/, "Paper ").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-muted-foreground">Duration</dt>
                <dd className="font-medium text-foreground">{paper.durationInMinutes} min</dd>
              </div>
            </dl>
          </div>
        </div>
      </aside>
    </div>
  );
}
