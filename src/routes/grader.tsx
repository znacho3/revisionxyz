import { createFileRoute } from '@tanstack/react-router'
import { FileUpload } from '@/components/ui/file-upload'
import { useState, useEffect, useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandItem, CommandList, CommandSearchInput } from "@/components/ui/command"
import { HiCheck, HiChevronDown, HiInformationCircle, HiLightningBolt, HiTranslate, HiX } from "react-icons/hi"
import { LuCircle } from "react-icons/lu"
import { BiCheck } from "react-icons/bi"
import { cn } from '@/lib/utils'
import ibSubjectsRaw from '@/data/ib-subjects.json'
import * as Flags from "country-flag-icons/react/3x2"
import type { FlagComponent } from "country-flag-icons/react/3x2"

export const Route = createFileRoute('/grader')({
  component: GraderPage,
})

type GraderLanguageOption = {
  code: string
  name: string
  Flag: FlagComponent | "composite-en" | "auto"
}

const GRADER_LANGUAGE_OPTIONS: GraderLanguageOption[] = [
  { code: "xx-XX", name: "Auto", Flag: "auto" },
  { code: "en-US", name: "English", Flag: "composite-en" },
  { code: "ar-SA", name: "Arabic", Flag: Flags.SA },
  { code: "fr-FR", name: "French", Flag: Flags.FR },
  { code: "de-DE", name: "German", Flag: Flags.DE },
  { code: "hi-IN", name: "Hindi", Flag: Flags.IN },
  { code: "id-ID", name: "Indonesian", Flag: Flags.ID },
  { code: "it-IT", name: "Italian", Flag: Flags.IT },
  { code: "ja-JP", name: "Japanese", Flag: Flags.JP },
  { code: "ko-KR", name: "Korean", Flag: Flags.KR },
  { code: "zh-CN", name: "Mandarin Chinese", Flag: Flags.CN },
  { code: "pt-BR", name: "Portuguese", Flag: Flags.BR },
  { code: "ru-RU", name: "Russian", Flag: Flags.RU },
  { code: "es-ES", name: "Spanish", Flag: Flags.ES },
  { code: "th-TH", name: "Thai", Flag: Flags.TH },
  { code: "ur-PK", name: "Urdu", Flag: Flags.PK },
  { code: "vi-VN", name: "Vietnamese", Flag: Flags.VN },
]

function GraderLanguageFlag({ Flag }: { Flag: FlagComponent | "composite-en" | "auto" }) {
  if (Flag === "auto") {
    return <HiTranslate className="h-4 w-4 text-muted-foreground" aria-hidden />
  }
  if (Flag === "composite-en") {
    return (
      <div className="flex gap-0">
        <div className="w-3 flex-none overflow-hidden rounded-sm">
          <Flags.GB className="h-4 w-6 rounded-sm" />
        </div>
        <div className="w-3 flex-none overflow-hidden rounded-sm">
          <Flags.US className="h-4 w-6 rounded-sm" />
        </div>
      </div>
    )
  }
  const FlagComponent = Flag
  return <FlagComponent className="h-4 w-6 rounded-sm" />
}

const ibSubjects = ibSubjectsRaw as {
  id: number
  slug: string
  title: string
}[]

type StepId = "file" | "subject" | "rubric" | "essay" | "settings" | "report" | "privacy"
type StepStatus = "completed" | "active" | "future"

function GraderPage() {
  const [file, setFile] = useState<File | null>(null)
  const [subjectId, setSubjectId] = useState<string>("")
  const [rubricId, setRubricId] = useState<string>("")
  const [courseLevel, setCourseLevel] = useState<string>("")
  const [progress, setProgress] = useState<string>("")
  const [language, setLanguage] = useState<string>("xx-XX")
  const [citationFormat, setCitationFormat] = useState<string>("")
  const [reportType, setReportType] = useState<string>("")
  const [hasUserSelectedReportType, setHasUserSelectedReportType] = useState(false)
  const [deleteAfter48h, setDeleteAfter48h] = useState<boolean>(true)
  const [certifyCoursework, setCertifyCoursework] = useState<boolean>(false)
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false)

  const [isSubjectOpen, setIsSubjectOpen] = useState(false)
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [rubricsData, setRubricsData] = useState<any[]>([])

  const selectedLanguageOption = GRADER_LANGUAGE_OPTIONS.find(l => l.code === language)

  useEffect(() => {
    fetch('/iaeetok_rubrics.json')
      .then(res => res.json())
      .then(data => setRubricsData(data))
      .catch(err => console.error("Failed to load rubrics", err))
  }, [])

  const selectedSubjectTitle = useMemo(() => {
    if (!subjectId) return ""
    return ibSubjects.find((s) => String(s.id) === subjectId)?.title || ""
  }, [subjectId])

  const selectedSubjectRubrics = useMemo(() => {
    if (!subjectId || !rubricsData.length) return []
    const subject = rubricsData.find(s => String(s.id) === subjectId)
    return subject ? subject.rubrics : []
  }, [subjectId, rubricsData])

  const selectedRubric = useMemo(() => {
    if (!rubricId || !selectedSubjectRubrics.length) return null
    return selectedSubjectRubrics.find((r: any) => r.id === rubricId) || null
  }, [rubricId, selectedSubjectRubrics])

  const rubricType: string | null = useMemo(() => {
    if (!selectedRubric) return null
    return selectedRubric.type || null
  }, [selectedRubric])

  useEffect(() => {
    if (selectedSubjectRubrics.length > 0) {
      if (!selectedSubjectRubrics.find((r: any) => r.id === rubricId)) {
        setRubricId(selectedSubjectRubrics[0].id)
      }
    } else if (subjectId) {
      setRubricId("")
    }
  }, [selectedSubjectRubrics, rubricId, subjectId])

  const handleSubjectChange = (id: string) => {
    setSubjectId(id)
    setRubricId("")
    setCourseLevel("")
  }

  const handleProgressChange = (mode: string) => {
    setProgress(mode)
    if (mode !== "complete") {
      setCitationFormat("")
    }
  }

  const handleReportTypeChange = (type: string) => {
    setReportType(type)
    setHasUserSelectedReportType(true)
  }

  const hasRubrics = selectedSubjectRubrics.length > 0
  const showRubricStep = !subjectId || hasRubrics

  const stepCompletion: Record<StepId, boolean> = {
    file: file !== null,
    subject: subjectId !== "",
    rubric: showRubricStep
      ? (rubricId !== "" && (courseLevel !== "" || rubricType !== "IA"))
      : true,
    essay: progress !== "",
    settings: language !== "" && (progress !== "complete" || citationFormat !== ""),
    report: hasUserSelectedReportType && reportType !== "",
    privacy: certifyCoursework && agreeTerms,
  }

  const visibleSteps: StepId[] = useMemo(() =>
    (["file", "subject", showRubricStep ? "rubric" : null, "essay", "settings", "report", "privacy"] as (StepId | null)[]).filter((s): s is StepId => s !== null),
  [showRubricStep])

  const getStepNumber = (step: StepId) => visibleSteps.indexOf(step) + 1
  const isLastStep = (step: StepId) => visibleSteps[visibleSteps.length - 1] === step

  const getStepStatus = (step: StepId): StepStatus => {
    const idx = visibleSteps.indexOf(step)
    const allPreviousComplete = visibleSteps.slice(0, idx).every(s => stepCompletion[s])
    if (stepCompletion[step] && allPreviousComplete) return "completed"
    if (allPreviousComplete) return "active"
    return "future"
  }

  const getCircleClasses = (step: StepId) => {
    const status = getStepStatus(step)
    switch (status) {
      case "completed": return "bg-accent-fuchsia text-accent-fuchsia-foreground"
      case "active": return "bg-accent-fuchsia-foreground text-accent-fuchsia border-2 border-accent-fuchsia-foreground"
      case "future": return "bg-muted text-muted-foreground"
    }
  }

  const getLabelClasses = (step: StepId) => {
    const status = getStepStatus(step)
    return status === "future" ? "text-muted-foreground" : "text-foreground"
  }

  const isPreviousComplete = (step: StepId) => {
    const idx = visibleSteps.indexOf(step)
    return visibleSteps.slice(0, idx).every(s => stepCompletion[s])
  }

  const allComplete = visibleSteps.every(s => stepCompletion[s])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <main className="w-full overflow-hidden overflow-y-auto overscroll-none bg-background focus:outline-none mx-auto h-(--container-height-sm) border-border border-t-2 md:h-(--container-height) md:rounded-2xl md:border-2 relative p-0!">
        <div className="md:max-w-3xl lg:max-w-4xl xl:max-w-5xl isolate mx-auto w-full px-4 pt-12 pb-16 sm:px-6 sm:pt-20 lg:px-8 max-w-none! p-0!">
          <div
            className="-z-10 absolute inset-x-0 top-0 flex h-48 items-center overflow-hidden md:inset-x-0"
            style={{ transform: "translateZ(0px)", willChange: "opacity" }}
          >
            <div className="h-full w-full"></div>
          </div>
          <div className="mt-0! h-auto">
            <img
              alt="Coursework banner"
              loading="lazy"
              width="1177"
              height="549"
              decoding="async"
              data-nimg="1"
              className="sm:-mt-16 lg:-mt-32 xl:-mt-48 mx-auto w-full max-w-7xl"
              src="https://assets.revisiondojo.com/assets/images/banners/coursework-banner.svg"
              style={{ color: "transparent" }}
            />
          </div>
          <div className="mx-auto w-full max-w-7xl px-4">
            <div className="mx-auto w-full max-w-3xl space-y-12 pb-48">
              <div className="mt-12 px-4 text-center sm:px-6 lg:px-8">
                <h1 className="h0 mx-auto max-w-xl font-title">
                  Get{" "}
                  <span className="text-accent-fuchsia-foreground underline decoration-[6px] decoration-accent-fuchsia-foreground/50 underline-offset-4">
                    instant feedback
                  </span>{" "}
                  on your coursework
                </h1>
                <p className="mx-auto mt-8 max-w-xl text-lg text-muted-foreground">
                  Upload your coursework and get it graded with detailed feedback
                  and suggestions.
                </p>
              </div>
              <div className="mx-auto max-w-3xl">
                <form className="space-y-8">
                  <div className="relative">
                    <div className="space-y-4 transition-all duration-300">
                      <div className="relative flex items-center gap-3">
                        <div className={cn("z-10 grid h-8 w-8 flex-none place-items-center rounded-full font-title ring-[6px] ring-background", getCircleClasses("file"))}>
                          {getStepNumber("file")}
                        </div>
                        <span className={cn("font-medium text-lg", getLabelClasses("file"))}>
                          Upload your coursework
                        </span>
                      </div>
                      <div className="space-y-2 pl-10">
                        <div
                          aria-describedby="_r_3un_-form-item-description"
                          aria-invalid="false"
                          id="_r_3un_-form-item"
                        >
                          <FileUpload file={file} onFileSelect={setFile} />
                        </div>
                        <p
                          className="text-muted-foreground text-sm sr-only text-center"
                          id="_r_3un_-form-item-description"
                        >
                          Supported formats: PDF • Maximum size: 10MB
                        </p>
                      </div>
                    </div>
                    {!isLastStep("file") && <div className="absolute top-8 left-4 w-0.5 bg-border" style={{ height: "calc(100% + 32px)" }}></div>}
                  </div>
                  <div className="relative">
                    <div className={cn("space-y-4", !isPreviousComplete("subject") && "transition-all duration-300 pointer-events-none")}>
                      <div className="relative flex items-center gap-3">
                        <div className={cn("z-10 grid h-8 w-8 flex-none place-items-center rounded-full font-title ring-[6px] ring-background", getCircleClasses("subject"))}>
                          {getStepNumber("subject")}
                        </div>
                        <span className={cn("font-medium text-lg", getLabelClasses("subject"))}>
                          Choose your subject
                        </span>
                      </div>
                      {isPreviousComplete("subject") && (
                        <div className="space-y-4 pl-10">
                          <div className="space-y-2">
                            <Popover open={isSubjectOpen} onOpenChange={setIsSubjectOpen}>
                              <PopoverTrigger asChild>
                                <button
                                  className="inline-flex cursor-pointer items-center font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 bg-muted hover:bg-border hover:text-foreground focus-visible:ring-muted-foreground/50 w-auto justify-between rounded-2xl px-3 py-2 text-sm text-foreground"
                                  type="button"
                                >
                                  {selectedSubjectTitle || "Select subject..."}
                                  <HiChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                <Command>
                                  <div className="p-1">
                                    <CommandSearchInput placeholder="Search subject..." />
                                  </div>
                                  <CommandList>
                                    <CommandGroup>
                                      {ibSubjects.map((subject) => (
                                        <CommandItem
                                          key={subject.slug}
                                          value={subject.title}
                                          onSelect={() => {
                                            handleSubjectChange(String(subject.id));
                                            setIsSubjectOpen(false);
                                          }}
                                        >
                                          <span className="truncate-1 flex-1">{subject.title}</span>
                                          <HiCheck
                                            className={cn(
                                              "ml-2 size-5 shrink-0",
                                              subjectId === String(subject.id) ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      )}
                    </div>
                    {!isLastStep("subject") && <div className="absolute top-8 left-4 w-0.5 bg-border" style={{ height: "calc(100% + 32px)" }}></div>}
                  </div>
                  {showRubricStep && (<div className="relative">
                    <div className={cn("space-y-4", !isPreviousComplete("rubric") && "transition-all duration-300 pointer-events-none")}>
                      <div className="relative flex items-center gap-3">
                        <div className={cn("z-10 grid h-8 w-8 flex-none place-items-center rounded-full font-title ring-[6px] ring-background", getCircleClasses("rubric"))}>
                          {getStepNumber("rubric")}
                        </div>
                        <span className={cn("font-medium text-lg", getLabelClasses("rubric"))}>
                          Select grading rubric and level
                        </span>
                      </div>
                      {isPreviousComplete("rubric") && (
                        <div>
                          <div className="space-y-4 pl-10">
                            {selectedSubjectRubrics.length === 0 ? (
                              <div className="flex items-center justify-center rounded-lg border border-border p-4 text-muted-foreground text-sm">
                                {subjectId ? "No rubrics available for this subject" : "Please select a subject first to view available rubrics"}
                              </div>
                            ) : (<>
                            <div className="space-y-2">
                              <div role="radiogroup" aria-required="false" dir="ltr" className="grid gap-2 sm:grid-cols-2" tabIndex={0} style={{ outline: "none" }}>
                                {selectedSubjectRubrics.map((rubric: any) => {
                                  let totalMarks = rubric.totalMarks;
                                  
                                  const criteriaList = rubric.criteria?.map((criterion: any) => {
                                    let maxMark = 0;
                                    criterion.bands?.forEach((band: any) => {
                                      if (band.marksTo > maxMark) maxMark = band.marksTo;
                                    });
                                    return {
                                      groupName: criterion.groupName,
                                      maxMark
                                    }
                                  }) || [];

                                  return (
                                    <div key={rubric.id}>
                                      <label className={cn("block cursor-pointer rounded-2xl border-2 bg-background transition-colors min-h-full", rubricId === rubric.id ? "border-accent-fuchsia-foreground/50 border-4" : "border-border")} htmlFor={`rubric-${rubric.id}`}>
                                        <div className="mb-2 flex w-full items-center justify-between gap-2 border-border border-b-2 px-4 py-3">
                                          <div className="font-medium text-lg">{rubric.name}</div>
                                          <button type="button" role="radio" aria-checked={rubricId === rubric.id} data-state={rubricId === rubric.id ? "checked" : "unchecked"} value={rubric.id} className="aspect-square h-5 w-5 flex-none rounded-full border-2 border-black text-black ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white" id={`rubric-${rubric.id}`} tabIndex={rubricId === rubric.id ? 0 : -1} onClick={() => setRubricId(rubric.id)}>
                                            {rubricId === rubric.id && <span data-state="checked" className="flex items-center justify-center"><LuCircle className="h-3 w-3 fill-black text-black dark:fill-white dark:text-white" aria-hidden /></span>}
                                          </button>
                                          <input aria-hidden="true" tabIndex={-1} type="radio" value={rubric.id} style={{ transform: "translateX(-100%)", position: "absolute", pointerEvents: "none", opacity: 0, margin: "0px", width: "20px", height: "20px" }} checked={rubricId === rubric.id} readOnly />
                                        </div>
                                        <table className="mb-1 w-full">
                                          <tbody className="space-y-1">
                                            {criteriaList.map((criterion: any, idx: number) => (
                                              <tr key={idx}>
                                                <td className="truncate-1 py-1 pl-4 text-sm">{criterion.groupName}</td>
                                                <td className="py-1 pr-4 text-right text-sm">{criterion.maxMark}</td>
                                              </tr>
                                            ))}
                            <tr>
                                                <td className="py-2 pl-4 font-semibold text-foreground text-sm">Total</td>
                                              <td className="py-2 pr-4 text-right font-semibold text-foreground text-sm">{totalMarks}</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </label>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            {rubricType === "EE" && (
                              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 font-medium text-amber-500 text-sm">
                                <HiInformationCircle className="size-5" />
                                <span>RPPF scores are not graded for EE coursework</span>
                              </div>
                            )}
                            {rubricType === "IA" && (
                            <div className="space-y-2">
                              <label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-medium text-muted-foreground text-sm" htmlFor="_r_5h_-form-item">Course Level</label>
                              <div role="radiogroup" aria-required="false" dir="ltr" className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-describedby="_r_5h_-form-item-description" aria-invalid="false" id="_r_5h_-form-item" tabIndex={0} style={{ outline: "none" }}>
                                <label className={cn("font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex cursor-pointer items-center gap-3 rounded-2xl border-2 bg-background p-4 transition-colors hover:border-muted-foreground", courseLevel === "SL" ? "border-foreground" : "border-border")} htmlFor="sl">
                                  <button type="button" role="radio" aria-checked={courseLevel === "SL"} data-state={courseLevel === "SL" ? "checked" : "unchecked"} value="SL" className="aspect-square h-5 w-5 flex-none rounded-full border-2 border-black text-black ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white" id="sl" tabIndex={0} onClick={() => setCourseLevel("SL")}>
                                    {courseLevel === "SL" && <span data-state="checked" className="flex items-center justify-center"><LuCircle className="h-3 w-3 fill-black text-black dark:fill-white dark:text-white" aria-hidden /></span>}
                                  </button>
                                  <input aria-hidden="true" tabIndex={-1} type="radio" value="SL" style={{ transform: "translateX(-100%)", position: "absolute", pointerEvents: "none", opacity: 0, margin: "0px", width: "20px", height: "20px" }} checked={courseLevel === "SL"} readOnly />
                                  <span className="font-medium text-lg">Standard Level</span>
                                </label>
                                <label className={cn("font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex cursor-pointer items-center gap-3 rounded-2xl border-2 bg-background p-4 transition-colors hover:border-muted-foreground", courseLevel === "HL" ? "border-foreground" : "border-border")} htmlFor="hl">
                                  <button type="button" role="radio" aria-checked={courseLevel === "HL"} data-state={courseLevel === "HL" ? "checked" : "unchecked"} value="HL" className="aspect-square h-5 w-5 flex-none rounded-full border-2 border-black text-black ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white" id="hl" tabIndex={-1} onClick={() => setCourseLevel("HL")}>
                                    {courseLevel === "HL" && <span data-state="checked" className="flex items-center justify-center"><LuCircle className="h-3 w-3 fill-black text-black dark:fill-white dark:text-white" aria-hidden /></span>}
                                  </button>
                                  <input aria-hidden="true" tabIndex={-1} type="radio" value="HL" style={{ transform: "translateX(-100%)", position: "absolute", pointerEvents: "none", opacity: 0, margin: "0px", width: "20px", height: "20px" }} checked={courseLevel === "HL"} readOnly />
                                  <span className="font-medium text-lg">Higher Level</span>
                                </label>
                              </div>
                            </div>
                            )}
                          </>)}
                          </div>
                        </div>
                      )}
                    </div>
                    {!isLastStep("rubric") && <div className="absolute top-8 left-4 w-0.5 bg-border" style={{ height: "calc(100% + 32px)" }}></div>}
                  </div>)}
                  <div className="relative">
                    <div className={cn("space-y-4", !isPreviousComplete("essay") && "transition-all duration-300 pointer-events-none")}>
                      <div className="relative flex items-center gap-3">
                        <div className={cn("z-10 grid h-8 w-8 flex-none place-items-center rounded-full font-title ring-[6px] ring-background", getCircleClasses("essay"))}>
                          {getStepNumber("essay")}
                        </div>
                        <span className={cn("font-medium text-lg", getLabelClasses("essay"))}>
                          Select coursework progress
                        </span>
                      </div>
                      {isPreviousComplete("essay") && (
                        <div>
                          <div className="space-y-2 pl-10">
                            <div role="radiogroup" aria-required="false" dir="ltr" className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-describedby="_r_5k_-form-item-description" aria-invalid="false" id="_r_5k_-form-item" tabIndex={0} style={{ outline: "none" }}>
                              <label className={cn("font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 relative flex h-full min-h-[120px] cursor-pointer flex-col justify-between rounded-2xl border-2 bg-background p-4 transition-colors hover:border-muted-foreground", progress === "draft" ? "border-foreground" : "border-border")} htmlFor="draft">
                                <button type="button" role="radio" aria-checked={progress === "draft"} data-state={progress === "draft" ? "checked" : "unchecked"} value="draft" className="aspect-square h-5 w-5 flex-none rounded-full border-2 border-black text-black ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white absolute top-4 right-4" id="draft" tabIndex={-1} onClick={() => handleProgressChange("draft")}>
                                  {progress === "draft" && <span data-state="checked" className="flex items-center justify-center"><LuCircle className="h-3 w-3 fill-black text-black dark:fill-white dark:text-white" aria-hidden /></span>}
                                </button>
                                <input aria-hidden="true" tabIndex={-1} type="radio" value="draft" style={{ transform: "translateX(-100%)", position: "absolute", pointerEvents: "none", opacity: 0, margin: "0px", width: "20px", height: "20px" }} checked={progress === "draft"} readOnly />
                                <div className="mb-2 flex flex-col items-center gap-3">
                                  <img alt="Coursework draft" loading="lazy" width="160" height="160" decoding="async" data-nimg="1" className="shrink-0" src="https://assets.revisiondojo.com/assets/images/cards/coursework-unfinished.svg" style={{ color: "transparent" }} />
                                  <span className="text-center font-medium text-lg leading-5">I haven't finished my work</span>
                                </div>
                                <span className="mt-1 block text-center text-muted-foreground text-sm">Get feedback on your coursework draft before your first official submission.</span>
                                <div className="mt-3 flex items-center justify-center">
                                  <span className="flex items-center gap-1 font-medium text-foreground text-sm">
                                    <HiLightningBolt className="size-5 text-accent-fuchsia-foreground opacity-60" aria-hidden />
                                    FREE
                                  </span>
                                </div>
                              </label>
                              <label className={cn("font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 relative flex h-full min-h-[120px] cursor-pointer flex-col justify-between rounded-2xl border-2 bg-background p-4 transition-colors hover:border-muted-foreground", progress === "complete" ? "border-foreground" : "border-border")} htmlFor="complete">
                                <button type="button" role="radio" aria-checked={progress === "complete"} data-state={progress === "complete" ? "checked" : "unchecked"} value="complete" className="aspect-square h-5 w-5 flex-none rounded-full border-2 border-black text-black ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white absolute top-4 right-4" id="complete" tabIndex={0} onClick={() => handleProgressChange("complete")}>
                                  {progress === "complete" && <span data-state="checked" className="flex items-center justify-center"><LuCircle className="h-3 w-3 fill-black text-black dark:fill-white dark:text-white" aria-hidden /></span>}
                                </button>
                                <input aria-hidden="true" tabIndex={-1} type="radio" value="complete" style={{ transform: "translateX(-100%)", position: "absolute", pointerEvents: "none", opacity: 0, margin: "0px", width: "20px", height: "20px" }} checked={progress === "complete"} readOnly />
                                <div className="mb-2 flex flex-col items-center gap-3">
                                  <img alt="Coursework finished" loading="lazy" width="160" height="160" decoding="async" data-nimg="1" className="shrink-0" src="https://assets.revisiondojo.com/assets/images/cards/coursework-finished.svg" style={{ color: "transparent" }} />
                                  <span className="text-center font-medium text-lg leading-5">I've finished writing my work</span>
                                </div>
                                <span className="mt-1 block text-center text-muted-foreground text-sm">Receive graded feedback on all criteria of your coursework.</span>
                                <div className="mt-3 flex items-center justify-center">
                                  <span className="flex items-center gap-1 font-medium text-foreground text-sm">
                                    <HiLightningBolt className="size-5 text-accent-fuchsia-foreground opacity-60" aria-hidden />
                                    FREE
                                  </span>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {!isLastStep("essay") && <div className="absolute top-8 left-4 w-0.5 bg-border" style={{ height: "calc(100% + 32px)" }}></div>}
                  </div>
                  <div className="relative">
                    <div className={cn("space-y-4", !isPreviousComplete("settings") && "transition-all duration-300 pointer-events-none")}>
                      <div className="relative flex items-center gap-3">
                        <div className={cn("z-10 grid h-8 w-8 flex-none place-items-center rounded-full font-title ring-[6px] ring-background", getCircleClasses("settings"))}>
                          {getStepNumber("settings")}
                        </div>
                        <span className={cn("font-medium text-lg", getLabelClasses("settings"))}>
                          Configure submission settings
                        </span>
                      </div>
                      {isPreviousComplete("settings") && (
                        <div>
                          <div className="space-y-6 pl-10">
                            <div className="space-y-3">
                              <label className="block peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-medium text-muted-foreground text-sm">
                                Coursework Language
                              </label>
                              <Popover open={isLanguageOpen} onOpenChange={setIsLanguageOpen}>
                                <PopoverTrigger asChild>
                                  <button
                                    className="inline-flex h-12 w-full max-w-md items-center justify-between rounded-2xl bg-muted px-5 py-3 text-base font-medium text-foreground ring-offset-background transition-all hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[200px]"
                                    type="button"
                                  >
                                    <span className="flex items-center gap-2 truncate text-left">
                                      {selectedLanguageOption ? (
                                        <>
                                          <GraderLanguageFlag Flag={selectedLanguageOption.Flag} />
                                          <span>{selectedLanguageOption.name}</span>
                                        </>
                                      ) : (
                                        "Select language"
                                      )}
                                    </span>
                                    <HiChevronDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0" align="start">
                                  <Command>
                                    <div className="p-1">
                                      <CommandSearchInput placeholder="Search language..." />
                                    </div>
                                    <CommandList>
                                      <CommandGroup>
                                        {GRADER_LANGUAGE_OPTIONS.map((lang) => (
                                          <CommandItem
                                            key={lang.code}
                                            value={`${lang.code} ${lang.name}`}
                                            onSelect={() => {
                                              setLanguage(lang.code)
                                              setIsLanguageOpen(false)
                                            }}
                                          >
                                            <div className="flex w-full items-center gap-2">
                                              <GraderLanguageFlag Flag={lang.Flag} />
                                              <span className="flex-1 truncate">{lang.name}</span>
                                              <HiCheck className={cn("ml-2 h-4 w-4 shrink-0", language === lang.code ? "opacity-100" : "opacity-0")} />
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            {language && language !== "en-US" && language !== "xx-XX" && (
                              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 font-medium text-amber-500 text-sm">
                                <HiInformationCircle className="size-5" />
                                <span>Accuracy may vary for non-English submissions</span>
                              </div>
                            )}
                            {progress === "complete" && (<div className="space-y-2">
                              <label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-medium text-muted-foreground text-sm">Citation Format</label>
                              <div role="radiogroup" aria-required="false" dir="ltr" className="grid grid-cols-1 gap-2 sm:grid-cols-2" tabIndex={0} style={{ outline: "none" }}>
                                {[
                                  { value: "MLA", label: "MLA", desc: "Modern Language Association" },
                                  { value: "APA", label: "APA", desc: "American Psychological Association" },
                                  { value: "Chicago", label: "Chicago", desc: "Chicago Manual of Style" },
                                  { value: "Other", label: "Other", desc: "Different citation format" },
                                ].map((fmt) => (
                                  <label key={fmt.value} className={cn("font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex h-full min-h-[80px] cursor-pointer flex-col justify-between rounded-2xl border-2 bg-background p-4 transition-colors hover:border-muted-foreground", citationFormat === fmt.value ? "border-foreground" : "border-border")} htmlFor={`citation-${fmt.value}`}>
                                    <div className="mb-2 flex items-center gap-3">
                                      <button type="button" role="radio" aria-checked={citationFormat === fmt.value} data-state={citationFormat === fmt.value ? "checked" : "unchecked"} value={fmt.value} className="aspect-square h-5 w-5 flex-none rounded-full border-2 border-black text-black ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white mt-0.5" id={`citation-${fmt.value}`} tabIndex={citationFormat === fmt.value ? 0 : -1} onClick={() => setCitationFormat(fmt.value)}>
                                        {citationFormat === fmt.value && <span data-state="checked" className="flex items-center justify-center"><LuCircle className="h-3 w-3 fill-black text-black dark:fill-white dark:text-white" aria-hidden /></span>}
                                      </button>
                                      <input aria-hidden="true" tabIndex={-1} type="radio" value={fmt.value} style={{ transform: "translateX(-100%)", position: "absolute", pointerEvents: "none", opacity: 0, margin: "0px", width: "20px", height: "20px" }} checked={citationFormat === fmt.value} readOnly />
                                      <span className="font-medium text-lg">{fmt.label}</span>
                                    </div>
                                    <span className="mt-1 block text-muted-foreground text-sm">{fmt.desc}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {!isLastStep("settings") && <div className="absolute top-8 left-4 w-0.5 bg-border" style={{ height: "calc(100% + 32px)" }}></div>}
                  </div>
                  <div className="relative">
                    <div className={cn("space-y-4", !isPreviousComplete("report") && "transition-all duration-300 pointer-events-none")}>
                      <div className="relative flex items-center gap-3">
                        <div className={cn("z-10 grid h-8 w-8 flex-none place-items-center rounded-full font-title ring-[6px] ring-background", getCircleClasses("report"))}>
                          {getStepNumber("report")}
                        </div>
                        <span className={cn("font-medium text-lg", getLabelClasses("report"))}>
                          Select report type
                        </span>
                      </div>
                      {isPreviousComplete("report") && (
                        <div>
                          <div className="space-y-2 pl-10">
                            <div role="radiogroup" aria-required="false" dir="ltr" className="grid grid-cols-1 gap-2 sm:grid-cols-2" tabIndex={0} style={{ outline: "none" }}>
                              <label className={cn("font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 relative flex h-full cursor-pointer flex-col rounded-2xl border-2 bg-background p-4 transition-colors hover:border-muted-foreground", reportType === "mini" ? "border-foreground" : "border-border")} htmlFor="mini">
                                <button type="button" role="radio" aria-checked={reportType === "mini"} data-state={reportType === "mini" ? "checked" : "unchecked"} value="mini" className="aspect-square h-5 w-5 flex-none rounded-full border-2 border-black text-black ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white absolute top-4 right-4" id="mini" tabIndex={reportType === "mini" ? 0 : -1} onClick={() => handleReportTypeChange("mini")}>
                                  {reportType === "mini" && <span data-state="checked" className="flex items-center justify-center"><LuCircle className="h-3 w-3 fill-black text-black dark:fill-white dark:text-white" aria-hidden /></span>}
                                </button>
                                <input aria-hidden="true" tabIndex={-1} type="radio" value="mini" style={{ transform: "translateX(-100%)", position: "absolute", pointerEvents: "none", opacity: 0, margin: "0px", width: "20px", height: "20px" }} checked={reportType === "mini"} readOnly />
                                <div className="mb-4 flex flex-col items-center gap-3">
                                  <img alt="Mini report" loading="lazy" width="120" height="120" decoding="async" className="shrink-0" src="https://assets.revisiondojo.com/assets/images/icons/icon-mini-report.svg" style={{ color: "transparent" }} />
                                  <span className="text-center font-medium text-lg leading-5">Mini Report</span>
                                </div>
                                <div className="mb-4 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <HiCheck className="size-5 text-emerald-500 shrink-0" aria-hidden />
                                    <span className="text-muted-foreground text-sm">View strengths & weaknesses per criteria</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <HiCheck className="size-5 text-emerald-500 shrink-0" aria-hidden />
                                    <span className="text-muted-foreground text-sm">Get annotated comments per criteria</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <HiX className="size-5 text-red-500 shrink-0" aria-hidden />
                                    <span className="text-muted-foreground text-sm">View full score</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <HiX className="size-5 text-red-500 shrink-0" aria-hidden />
                                    <span className="text-muted-foreground text-sm">View all criteria</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <HiX className="size-5 text-red-500 shrink-0" aria-hidden />
                                    <span className="text-muted-foreground text-sm">Faster, less accurate</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <HiX className="size-5 text-red-500 shrink-0" aria-hidden />
                                    <span className="text-muted-foreground text-sm">Max file size: 10MB</span>
                                  </div>
                                </div>
                              </label>
                              <label className={cn("font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 relative flex h-full cursor-pointer flex-col rounded-2xl border-2 bg-background p-4 transition-colors hover:border-muted-foreground", reportType === "full" ? "border-foreground" : "border-border")} htmlFor="full">
                                <button type="button" role="radio" aria-checked={reportType === "full"} data-state={reportType === "full" ? "checked" : "unchecked"} value="full" className="aspect-square h-5 w-5 flex-none rounded-full border-2 border-black text-black ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white absolute top-4 right-4" id="full" tabIndex={reportType === "full" ? 0 : -1} onClick={() => handleReportTypeChange("full")}>
                                  {reportType === "full" && <span data-state="checked" className="flex items-center justify-center"><LuCircle className="h-3 w-3 fill-black text-black dark:fill-white dark:text-white" aria-hidden /></span>}
                                </button>
                                <input aria-hidden="true" tabIndex={-1} type="radio" value="full" style={{ transform: "translateX(-100%)", position: "absolute", pointerEvents: "none", opacity: 0, margin: "0px", width: "20px", height: "20px" }} checked={reportType === "full"} readOnly />
                                <div className="mb-4 flex flex-col items-center gap-3">
                                  <img alt="Full report" loading="lazy" width="120" height="120" decoding="async" className="shrink-0" src="https://assets.revisiondojo.com/assets/images/icons/icon-full-report.svg" style={{ color: "transparent" }} />
                                  <span className="text-center font-medium text-lg leading-5">Full Report</span>
                                </div>
                                <div className="mb-4 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <HiCheck className="size-5 text-emerald-500 shrink-0" aria-hidden />
                                    <span className="text-muted-foreground text-sm">View strengths & weaknesses per criteria</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <HiCheck className="size-5 text-emerald-500 shrink-0" aria-hidden />
                                    <span className="text-muted-foreground text-sm">Get annotated comments per criteria</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <HiCheck className="size-5 text-emerald-500 shrink-0" aria-hidden />
                                    <span className="text-muted-foreground text-sm">View full score</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <HiCheck className="size-5 text-emerald-500 shrink-0" aria-hidden />
                                    <span className="text-muted-foreground text-sm">View all criteria</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <HiCheck className="size-5 text-emerald-500 shrink-0" aria-hidden />
                                    <span className="text-muted-foreground text-sm">Slower, more accurate</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <HiCheck className="size-5 text-emerald-500 shrink-0" aria-hidden />
                                    <span className="text-muted-foreground text-sm">Max file size: 100MB</span>
                                  </div>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {!isLastStep("report") && <div className="absolute top-8 left-4 w-0.5 bg-border" style={{ height: "calc(100% + 32px)" }}></div>}
                  </div>
                  <div className={cn("space-y-4 transition-all duration-300", !isPreviousComplete("privacy") && "pointer-events-none")}>
                    <div className="relative flex items-center gap-3">
                      <div className={cn("z-10 grid h-8 w-8 flex-none place-items-center rounded-full font-title ring-[6px] ring-background", getCircleClasses("privacy"))}>
                        {getStepNumber("privacy")}
                      </div>
                      <span className={cn("font-medium text-lg", getLabelClasses("privacy"))}>
                        Confirm your privacy settings
                      </span>
                    </div>
                    {isPreviousComplete("privacy") && (
                      <div className="space-y-4 pl-10">
                        <div className="flex flex-row items-start space-x-3 space-y-0">
                          <button type="button" role="checkbox" aria-checked={deleteAfter48h} data-state={deleteAfter48h ? "checked" : "unchecked"} value="on" className="peer h-5 w-5 shrink-0 rounded-md border-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-accent-primary-foreground data-[state=checked]:bg-accent-primary-foreground data-[state=checked]:text-background" id="deleteAfter48h" onClick={() => setDeleteAfter48h(!deleteAfter48h)}>
                            {deleteAfter48h && <span data-state="checked" className="flex items-center justify-center text-current" style={{ pointerEvents: "none" }}><BiCheck className="-m-1 h-5 w-5" aria-hidden /></span>}
                          </button>
                          <input aria-hidden="true" tabIndex={-1} type="checkbox" value="on" style={{ position: "absolute", pointerEvents: "none", opacity: 0, margin: "0px", transform: "translateX(-100%)", width: "20px", height: "20px" }} checked={deleteAfter48h} readOnly />
                          <div className="space-y-1 leading-none">
                            <label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-normal text-sm" htmlFor="deleteAfter48h">Delete my file after 48 hours</label>
                          </div>
                        </div>
                        <div className="flex flex-row items-start space-x-3 space-y-0">
                          <button type="button" role="checkbox" aria-checked={certifyCoursework} data-state={certifyCoursework ? "checked" : "unchecked"} value="on" className="peer h-5 w-5 shrink-0 rounded-md border-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-accent-primary-foreground data-[state=checked]:bg-accent-primary-foreground data-[state=checked]:text-background" id="certifyCoursework" onClick={() => setCertifyCoursework(!certifyCoursework)}>
                            {certifyCoursework && <span data-state="checked" className="flex items-center justify-center text-current" style={{ pointerEvents: "none" }}><BiCheck className="-m-1 h-5 w-5" aria-hidden /></span>}
                          </button>
                          <input aria-hidden="true" tabIndex={-1} type="checkbox" value="on" style={{ position: "absolute", pointerEvents: "none", opacity: 0, margin: "0px", transform: "translateX(-100%)", width: "20px", height: "20px" }} checked={certifyCoursework} readOnly />
                          <div className="space-y-1 leading-none">
                            <label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-normal text-sm" htmlFor="certifyCoursework">I certify that this is my coursework, and that submitting coursework from other students goes against our <a className="text-accent-primary-foreground hover:underline" target="_blank" href="https://www.revisiondojo.com/terms-of-service" rel="noreferrer">terms of service</a>.</label>
                          </div>
                        </div>
                        <div className="flex flex-row items-start space-x-3 space-y-0">
                          <button type="button" role="checkbox" aria-checked={agreeTerms} data-state={agreeTerms ? "checked" : "unchecked"} value="on" className="peer h-5 w-5 shrink-0 rounded-md border-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-accent-primary-foreground data-[state=checked]:bg-accent-primary-foreground data-[state=checked]:text-background" id="agreeTerms" onClick={() => setAgreeTerms(!agreeTerms)}>
                            {agreeTerms && <span data-state="checked" className="flex items-center justify-center text-current" style={{ pointerEvents: "none" }}><BiCheck className="-m-1 h-5 w-5" aria-hidden /></span>}
                          </button>
                          <input aria-hidden="true" tabIndex={-1} type="checkbox" value="on" style={{ position: "absolute", pointerEvents: "none", opacity: 0, margin: "0px", transform: "translateX(-100%)", width: "20px", height: "20px" }} checked={agreeTerms} readOnly />
                          <div className="space-y-1 leading-none">
                            <label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-normal text-sm" htmlFor="agreeTerms">I agree to the <a className="text-accent-primary-foreground hover:underline" target="_blank" href="https://www.revisiondojo.com/terms-of-service" rel="noreferrer">Terms and Conditions</a> and <a className="text-accent-primary-foreground hover:underline" target="_blank" href="/privacy-policy" rel="noreferrer">Privacy Policy</a></label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={cn("space-y-4 transition-all duration-300", !allComplete && "pointer-events-none")}>
                    <button
                      className={cn("inline-flex items-center justify-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 px-5 py-3 font-medium text-lg rounded-2xl focus-visible:ring-accent-fuchsia-foreground/50 w-full transition-all duration-300", allComplete ? "bg-accent-fuchsia-foreground text-accent-fuchsia" : "bg-accent-fuchsia-foreground text-accent-fuchsia opacity-50")}
                      disabled={!allComplete}
                      type="submit"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>{allComplete ? "Grade Coursework" : "Complete all steps to continue"}</span>
                      </div>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
