import { useState, useEffect } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import { BiMinus, BiPlus, BiChevronDown, BiChevronUp } from "react-icons/bi";
import { HiBadgeCheck, HiCheck, HiX, HiTable, HiOutlineBookOpen } from "react-icons/hi";
import { CentralIcon } from "@central-icons-react/all";
import { centralIconProps, centralIconPropsOutlined24 } from "@/lib/icon-props";
import { cn } from "@/lib/utils";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";

export const Route = createFileRoute("/coursework-exemplars/file/$slug")({
  component: ExemplarDetailPage,
});

const PDF_WORKER_URL = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

type ExemplarsIndexEntry = {
  id: string;
  slug: string;
};

type RubricCriterionBand = {
  id: string;
  marksFrom: number;
  marksTo: number;
  rubricCriterionStrandBandContents?: { content: string }[];
};

type RubricCriterionStrand = {
  id: string;
  name: string;
};

type RubricCriterion = {
  id: string;
  groupName: string;
  orderIndex: number;
  rubricCriterionStrands: RubricCriterionStrand[];
  rubricCriterionBands: RubricCriterionBand[];
};

type FeedbackItem = {
  criterionId: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  groupName: string;
  calculationMethod?: string;
};

type StrandSelection = {
  strandId: string;
  bandScore: number;
  reasoning: string;
  selectedBandId: string;
};

type Annotation = {
  id: string;
  comment: string;
  type: "strength" | "weakness";
  pageNumber: number;
  quote?: string;
};

type ExemplarDetail = {
  title: string;
  subjectTitle: string;
  type: string;
  score: string | null; // letter grade
  pdfUrl: string;
  totalModeratedMark: number | null;
  maxMark: number;
  rubricCriteria: RubricCriterion[];
  feedback: FeedbackItem[];
  strandSelections: StrandSelection[];
  annotations: Annotation[];
};

type SidebarTab = "scores" | "rubric" | "similar";

function getLetterGradeColor(letter: string | null): string {
  if (!letter) return "hsl(0, 0%, 60%)";
  const pct = ({ A: 95, B: 85, C: 75, D: 65, E: 55 } as Record<string, number>)[letter.toUpperCase()] ?? 50;
  const hue = (pct / 100) * 120;
  return `hsl(${hue}, 70%, 50%)`;
}

function CriterionCard({
  criterion,
  feedback,
  strands,
  rubricBands,
  maxMark,
  letter
}: {
  criterion: RubricCriterion;
  feedback?: FeedbackItem;
  strands: StrandSelection[];
  rubricBands: RubricCriterionBand[];
  maxMark: number;
  letter: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const score = feedback?.score ?? 0;

  const currentBand = rubricBands.find(b => score >= b.marksFrom && score <= b.marksTo);
  const segmentPercent = maxMark > 0 ? 100 / maxMark : 0;
  const bandStartPercent = currentBand && maxMark > 0 ? (currentBand.marksFrom / maxMark) * 100 : 0;

  const pillLeft = `${bandStartPercent}%`;
  const pillWidth = `${segmentPercent}%`;

  const getDotColor = (s: number, max: number) => {
    const ratio = max > 0 ? s / max : 0;
    const hue = ratio * 120;
    return `hsl(${hue}, 70%, 50%)`;
  };
  
  const dotColor = getDotColor(score, maxMark);

  const getStrandQuality = (sScore: number, sMax: number) => {
    const r = sMax > 0 ? sScore / sMax : 0;
    const hue = r * 120;
    const dot = `hsl(${hue}, 70%, 50%)`;
    if (r >= 0.8) return { label: "Excellent", color: "text-emerald-700 dark:text-emerald-500", dot };
    if (r >= 0.6) return { label: "Good", color: "text-lime-700 dark:text-lime-500", dot };
    if (r >= 0.4) return { label: "Satisfactory", color: "text-yellow-700 dark:text-yellow-500", dot };
    return { label: "Limited", color: "text-red-700 dark:text-red-500", dot };
  };

  return (
    <div className="relative rounded-2xl border-2 bg-background" style={{ borderColor: dotColor }}>
      <div>
        <div className="border-border border-b-2 p-5">
          <div className="mb-3 flex items-start justify-between">
            <div className="sticky top-0 flex items-center gap-3 sticky:border-border sticky:border-b-2">
              <div className="h-5 w-5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }}></div>
              <div className="h4 truncate-2 font-title text-foreground">Criteria {letter}: {criterion.groupName}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="font-title text-xl font-semibold tracking-tight text-foreground">{score}/{maxMark}</div>
            </div>
          </div>
          
          <div className="mt-4 pr-5 pb-8">
            <div className="relative isolate mb-8 w-full" style={{ height: "32px" }}>
              <div className="absolute top-0 left-0 h-full w-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500 opacity-30" />
              {currentBand && (
                <>
                  <div
                    className="absolute top-0 h-full rounded-full shadow-xl ring-white saturate-150 transition-all duration-500"
                    style={{
                      left: `calc(${pillLeft} - 20px)`,
                      width: `calc(${pillWidth} + 40px)`,
                      boxShadow: "0 0 0 4px white, var(--tw-shadow)",
                      background: "linear-gradient(to right, rgb(239, 68, 68) -500%, rgb(245, 158, 11) -200%, rgb(34, 197, 94) 100%)"
                    }}
                  />
                  <div
                    className="absolute top-0 h-full rounded-full pointer-events-none"
                    style={{
                      left: `calc(${pillLeft} - 20px)`,
                      width: `calc(${pillWidth} + 40px)`,
                      zIndex: 20,
                      backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255,255,255,0.35) 2px, rgba(255,255,255,0.35) 4px)"
                    }}
                  />
                </>
              )}

              <div className="absolute left-0 w-full bg-border dark:bg-muted-foreground/50" style={{ height: "2px", bottom: "-20px" }}></div>
              <div className="-translate-x-1/2 absolute" style={{ left: "0%", bottom: "-20px" }}>
                <div className="bg-border dark:bg-muted-foreground/50" style={{ height: "12px", width: "2px" }}></div>
                <span className="-translate-x-1/2 absolute left-1/2 font-medium text-muted-foreground" style={{ top: "16px", fontSize: "14px" }}>0</span>
              </div>
              <div className="-translate-x-1/2 absolute" style={{ left: "50%", bottom: "-20px" }}>
                <div className="bg-border dark:bg-muted-foreground/50" style={{ height: "12px", width: "2px" }}></div>
                <span className="-translate-x-1/2 absolute left-1/2 font-medium text-muted-foreground" style={{ top: "16px", fontSize: "14px" }}>{Math.round(maxMark/2)}</span>
              </div>
              <div className="-translate-x-1/2 absolute" style={{ left: "100%", bottom: "-20px" }}>
                <div className="bg-border dark:bg-muted-foreground/50" style={{ height: "12px", width: "2px" }}></div>
                <span className="-translate-x-1/2 absolute left-1/2 font-medium text-muted-foreground" style={{ top: "16px", fontSize: "14px" }}>{maxMark}</span>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
              <h4 className="h4 mb-2 font-title text-foreground">Criteria Strands</h4>
              <button className="inline-flex items-center justify-center font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 w-fit px-3 py-1 text-sm rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-foreground/50 gap-1">
                {expanded ? "Hide" : "View"} Rubric
                {expanded ? <BiChevronUp className="size-5" /> : <BiChevronDown className="size-5" />}
              </button>
            </div>
            
            {expanded && (
              <div className="grid grid-cols-1 gap-3 mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                {criterion.rubricCriterionStrands.map(strand => {
                  const selection = strands.find(s => s.strandId === strand.id);
                  const quality = getStrandQuality(selection?.bandScore ?? 0, maxMark);
                  
                  return (
                    <div key={strand.id} className="overflow-hidden rounded-xl border-2 border-border bg-background">
                      <div className="flex w-full items-center gap-3 p-3 transition-colors hover:bg-muted">
                        <div className={cn("flex w-24 shrink-0 items-center gap-2 font-medium text-sm", quality.color)}>
                          <svg height="20" viewBox="0 0 20 20" width="20">
                            <circle cx="10" cy="10" fill="var(--background)" r="9" stroke={quality.dot} strokeWidth="2"></circle>
                            <path d="M 10 10 m 0 -9 A 9 9 0 1 1 9.99 1 Z" fill={quality.dot}></path>
                            <circle cx="10" cy="10" fill="transparent" r="9" stroke={quality.dot} strokeWidth="2"></circle>
                          </svg>
                          <span className="whitespace-nowrap">{quality.label}</span>
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <div className="truncate font-medium text-base">{strand.name}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {feedback && (
           <div className="space-y-2 border-border border-b-2 p-5 rounded-b-xl">
              <ul className="space-y-2">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <HiCheck className="size-6 shrink-0 text-green-600 dark:text-green-500" aria-hidden />
                    <div className="text-foreground leading-relaxed">
                      <p>{s}</p>
                    </div>
                  </li>
                ))}
                {feedback.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <HiX className="size-6 shrink-0 text-red-600 dark:text-red-500" aria-hidden />
                    <div className="text-foreground leading-relaxed">
                      <p>{w}</p>
                    </div>
                  </li>
                ))}
              </ul>
           </div>
        )}
      </div>
    </div>
  );
}

function ExemplarDetailPage() {
  const { slug } = useParams({ strict: false });
  const [exemplar, setExemplar] = useState<ExemplarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>("scores");

  const zoomPluginInstance = zoomPlugin();
  const { CurrentScale, zoomTo } = zoomPluginInstance;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const indexRes = await fetch("/exemplars-index.json");
        const indexJson = indexRes.ok ? await indexRes.json() : null;
        const entries: ExemplarsIndexEntry[] = Array.isArray(indexJson?.entries) ? indexJson.entries : [];
        if (cancelled) return;
        const currentEntry = entries.find((entry) => entry.slug === slug) ?? null;
        if (!currentEntry) {
          setExemplar(null);
          return;
        }

        const detailRes = await fetch(`/exemplars/${currentEntry.id}.json`);
        const detailJson = detailRes.ok ? await detailRes.json() : null;
        if (cancelled) return;
        if (!detailJson?.serverData?.detailedExemplarData) {
          setExemplar(null);
          return;
        }

        const detailed = detailJson.serverData.detailedExemplarData;
        const rubricCriteria = detailJson.serverData.rubricData?.rubricCriteria ?? [];
        
        // find max marks for each criterion, and map criterions
        const processedCriteria: RubricCriterion[] = rubricCriteria.map((c: any) => ({
          id: c.id,
          groupName: c.groupName,
          orderIndex: c.orderIndex ?? 0,
          rubricCriterionStrands: c.rubricCriterionStrands ?? [],
          rubricCriterionBands: c.rubricCriterionBands ?? []
        }));

        const maxMark = detailJson.serverData.rubricData?.totalMarks ?? 0;
        
        // feedback from serverData.submission.versions[-1].feedback. not detailedExemplarData
        const versions = detailJson.serverData.submission?.versions ?? detailed.submission?.versions ?? detailed.versions ?? [];
        const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
        const feedback = latestVersion?.feedback ?? [];
        const strandSelections = latestVersion?.strandSelections ?? [];
        const annotations = latestVersion?.annotations ?? [];

        const feedbackCriterionIds = new Set(feedback.map((f: { criterionId?: string }) => f.criterionId));
        const criteriaWithFeedback = processedCriteria.filter((c) => feedbackCriterionIds.has(c.id));

        setExemplar({
          title: detailed.title ?? "Coursework exemplar",
          subjectTitle: detailJson.serverData.subject?.title ?? "Unknown subject",
          type: detailJson.serverData.submission?.type ?? "Coursework",
          score: detailJson.serverData.userSubmission?.score ?? null,
          pdfUrl: `https://dl.pirateib.sh/Revision%20Dojo%20Archive/exemplars/${currentEntry.id}.pdf`,
          totalModeratedMark: detailed.userSubmission?.totalModeratedMark ?? null,
          maxMark,
          rubricCriteria: criteriaWithFeedback,
          feedback,
          strandSelections,
          annotations,
        });
      } catch {
        if (!cancelled) setExemplar(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (slug) {
      load();
    } else {
      setLoading(false);
      setExemplar(null);
    }

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleDownload = () => {
    if (!exemplar) return;
    const link = document.createElement("a");
    link.href = exemplar.pdfUrl;
    link.download = `${exemplar.title.replace(/[^a-z0-9-_]/gi, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="flex h-full min-h-0 w-full items-center justify-center"><p className="text-muted-foreground">Loading exemplar…</p></div>;
  if (!exemplar) return <div className="flex h-full min-h-0 w-full items-center justify-center"><p className="text-muted-foreground">Exemplar not found.</p></div>;

  const maxMark = exemplar.maxMark ?? exemplar.rubricCriteria.reduce((acc, c) => {
    const maxBand = c.rubricCriterionBands.reduce((max, b) => Math.max(max, b.marksTo), 0);
    return acc + maxBand;
  }, 0);

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col border-border lg:border-r">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1">
             <CurrentScale>{(props) => (
                <>
                  <button onClick={() => zoomTo(Math.max(0.5, (props.scale ?? 1) - 0.25))} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><BiMinus className="size-4" /></button>
                  <span className="min-w-[3rem] text-center text-sm font-medium text-foreground">{Math.round((props.scale ?? 1) * 100)}%</span>
                  <button onClick={() => zoomTo(Math.min(3, (props.scale ?? 1) + 0.25))} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><BiPlus className="size-4" /></button>
                </>
             )}</CurrentScale>
          </div>
          <button onClick={handleDownload} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><CentralIcon {...centralIconProps} name="IconArrowInbox" size={16} className="size-4" ariaHidden /></button>
        </div>
        <div className="h-full min-h-0 flex-1 overflow-auto bg-muted/30">
          <Worker workerUrl={PDF_WORKER_URL}><Viewer fileUrl={exemplar.pdfUrl} plugins={[zoomPluginInstance]} /></Worker>
        </div>
      </div>

      <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-t border-border bg-background lg:border-t-0 lg:border-l">
        <div className="relative border-border border-b-2 bg-muted/30">
          <div role="tablist" className="flex w-full cursor-grab select-none overflow-x-auto [scrollbar-width:none]">
             <button onClick={() => setActiveTab("scores")} className={cn("flex flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 pt-3 pb-2.5 font-medium text-lg transition-colors", activeTab === "scores" ? "border-accent-primary-foreground text-accent-primary-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
               <CentralIcon {...centralIconPropsOutlined24} name="IconCircleCheck" className="size-7 shrink-0 opacity-60" ariaHidden />
               <span>Scores</span>
             </button>
             <button onClick={() => setActiveTab("rubric")} className={cn("flex flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 pt-3 pb-2.5 font-medium text-lg transition-colors", activeTab === "rubric" ? "border-accent-primary-foreground text-accent-primary-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
               <HiTable className="size-7 shrink-0 opacity-60" aria-hidden />
               <span>Rubric</span>
             </button>
             <button onClick={() => setActiveTab("similar")} className={cn("flex flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 pt-3 pb-2.5 font-medium text-lg transition-colors", activeTab === "similar" ? "border-accent-primary-foreground text-accent-primary-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
               <HiOutlineBookOpen className="size-7 shrink-0 opacity-60" aria-hidden />
               <span>Similar Exemplars</span>
               <span className="ml-1 rounded-full bg-accent-primary px-2 py-0.5 font-semibold text-accent-primary-foreground text-sm">0</span>
             </button>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-transparent to-background" aria-hidden />
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {activeTab === "scores" && (
            <div className="flex h-full flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4"><p className="truncate min-w-0 flex-1 text-sm font-medium text-muted-foreground">{exemplar.subjectTitle} {exemplar.type} Exemplar</p></div>
                  <div><h2 className="font-title text-2xl font-semibold tracking-tight text-foreground">{exemplar.title}</h2></div>

                  <div className="mb-4 p-4">
                    <div className="mb-4 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-3">
                        <div className="flex w-full items-center gap-6">
                          <div className="flex h-20 w-20 items-center justify-center rounded-3xl font-title text-3xl font-bold text-background shrink-0" style={{ backgroundColor: getLetterGradeColor(exemplar.score) }}>
                            {exemplar.score ?? "—"}
                          </div>
                          <div className="flex-1">
                            <div className="h2 flex items-center gap-2 font-title text-foreground">
                              Overall Score
                              <button className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 pr-3 pl-1 text-blue-600 transition-opacity hover:opacity-60 dark:bg-blue-600/20 dark:text-blue-400" type="button">
                                <HiBadgeCheck className="size-6" aria-hidden />
                                <span className="font-medium text-sm tracking-tight">Verified</span>
                              </button>
                            </div>
                            <div className="mt-1 font-medium text-muted-foreground text-xl">
                              {exemplar.totalModeratedMark !== null ? `${exemplar.totalModeratedMark}/${maxMark}` : "No score"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pb-6">
                    {exemplar.rubricCriteria
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((criterion, index) => {
                        const feedbackItem = exemplar.feedback.find(f => f.criterionId === criterion.id);
                        const cMax = criterion.rubricCriterionBands.reduce((m, b) => Math.max(m, b.marksTo), 0);
                        // filter strands for each criterion
                        const cStrands = exemplar.strandSelections.filter(s => 
                          criterion.rubricCriterionStrands.some(rs => rs.id === s.strandId)
                        );
                        
                        const letter = String.fromCharCode(65 + index); // easiest way to do it ig

                        return (
                          <CriterionCard 
                            key={criterion.id} 
                            criterion={criterion} 
                            feedback={feedbackItem} 
                            strands={cStrands}
                            rubricBands={criterion.rubricCriterionBands}
                            maxMark={cMax}
                            letter={letter}
                          />
                        );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab !== "scores" && (
            <div className="flex flex-1 items-center justify-center p-6">
              {/* todo */}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
