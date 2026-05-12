import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HiSearch, HiChevronDown, HiCheck, HiCheckCircle, HiX } from "react-icons/hi";
import { cn } from "@/lib/utils";
import ibSubjectsRaw from "@/data/ib-subjects.json";
import { ExemplarCard } from "@/components/iaeetok/ExemplarCard";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSearchInput,
} from "@/components/ui/command";
import * as Flags from "country-flag-icons/react/3x2";
import type { FlagComponent } from "country-flag-icons/react/3x2";

export const Route = createFileRoute("/coursework-exemplars/")({
  component: CourseworkExemplarsPage,
});
const ibSubjects = ibSubjectsRaw as {
  id: number;
  slug: string;
  title: string;
  coverImageUrl?: string;
  group?: number | string;
}[];

type LanguageOption = {
  code: string;
  name: string;
  Flag: FlagComponent | "composite-en";
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", name: "English", Flag: "composite-en" },
  { code: "es", name: "Spanish", Flag: Flags.ES },
  { code: "fr", name: "French", Flag: Flags.FR },
  { code: "de", name: "German", Flag: Flags.DE },
  { code: "zh", name: "Chinese", Flag: Flags.CN },
  { code: "hi", name: "Hindi", Flag: Flags.IN },
  { code: "ar", name: "Arabic", Flag: Flags.SA },
  { code: "ru", name: "Russian", Flag: Flags.RU },
];

function decodeMojibakeUtf8(input: string | null | undefined): string {
  if (!input) return "";

  // If the string already contains non-Latin-1 characters, assume it's fine.
  let hasHighLatin1 = false;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code > 0xff) return input;
    if (code >= 0x80) hasHighLatin1 = true;
  }
  if (!hasHighLatin1) return input;

  try {
    const bytes = new Uint8Array(Array.from(input, (ch) => ch.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return decoded || input;
  } catch { return input; }
}

function LanguageFlag({ Flag }: { Flag: FlagComponent | "composite-en" }) {
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
    );
  }

  const FlagComponent = Flag;
  return <FlagComponent className="h-4 w-6 rounded-sm" />;
}

type RawIaEeTokItem = any;

type IaEeTokInfo = {
  data: RawIaEeTokItem[];
};

type IaEeTokLangInfoEntry = {
  lang: string;
  info: {
    data: RawIaEeTokItem[];
  };
};

type IaEeTokLangInfo = IaEeTokLangInfoEntry[];

function mapItemToExemplar(item: RawIaEeTokItem) {
  const subjectId: number | null =
    item.userSubmission?.subjectId ??
    item.subject?.id ??
    item.submission?.subjectId ??
    null;

  let type = "Coursework";
  if (item.tags.includes("ee") || item.rubric?.type === "EE") type = "EE";
  else if (item.tags.includes("ia") || item.rubric?.type === "IA") type = "IA";
  else if (item.tags.includes("tok") || item.rubric?.type === "TOK")
    type = "TOK";

  // Determine score
  let score = "N/A";
  if (item.totalModeratedMark) score = item.totalModeratedMark.toString();
  else if (item.tags.includes("grade-A")) score = "A";
  else if (item.tags.includes("grade-B")) score = "B";
  else if (item.tags.includes("grade-C")) score = "C";
  else if (item.tags.includes("grade-D")) score = "D";
  else if (item.tags.includes("grade-E")) score = "E";
  else if (item.tags.includes("grade-7")) score = "7";
  else if (item.tags.includes("grade-6")) score = "6";
  else if (item.tags.includes("grade-5")) score = "5";
  else if (item.tags.includes("grade-4")) score = "4";

  // Get subject
  const ibSubject = subjectId ? ibSubjects.find((subject) => subject.id === subjectId) : null;
  const subjectTitle =
    ibSubject?.title ||
    item.subject?.title ||
    item.userSubmission?.subject?.title ||
    item.submission?.subject?.title ||
    "Unknown Subject";

  const rawTitle =
    (item.title && item.title.trim()) ||
    (item.userSubmission?.researchQuestion &&
      item.userSubmission.researchQuestion.trim()) ||
    "";
  const title = decodeMojibakeUtf8(rawTitle) || "Untitled";

  // Get image
  let image = "";
  if (item.submission?.files && item.submission.files.length > 0) {
    image = item.submission.files[0].thumbnailUrl;
  }

  return {
    id: item.id,
    slug: item.slug,
    title,
    subject: subjectTitle,
    subjectId,
    type,
    score,
    image,
    isPro: item.isPremium,
  };
}

type Exemplar = ReturnType<typeof mapItemToExemplar>;

type LanguageExemplarsByLang = Record<string, Exemplar[]>;

function CourseworkExemplarsPage() {
  const [baseExemplars, setBaseExemplars] = useState<Exemplar[]>([]);
  const [languageExemplarsByLang, setLanguageExemplarsByLang] = useState<LanguageExemplarsByLang>({});
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<number | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string[]>([]);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isSidebarSubjectOpen, setIsSidebarSubjectOpen] = useState(false);
  const [isSidebarLanguageOpen, setIsSidebarLanguageOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/exemplars_info.json").then((r) => (r.ok ? r.json() : null)),
      fetch("/exemplars_lang_info.json").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([info, lang]: [IaEeTokInfo | null, IaEeTokLangInfo | null]) => {
        if (cancelled) return;

        if (info?.data) {
          setBaseExemplars(info.data.map(mapItemToExemplar));
        } else {
          setBaseExemplars([]);
        }

        if (lang && Array.isArray(lang)) {
          const byLang: LanguageExemplarsByLang = Object.fromEntries(
            lang.map((entry) => [
              entry.lang,
              entry.info?.data ? entry.info.data.map(mapItemToExemplar) : [],
            ]),
          );
          setLanguageExemplarsByLang(byLang);
        } else {
          setLanguageExemplarsByLang({});
        }
      })
      .catch(() => {
        if (cancelled) return;
        setBaseExemplars([]);
        setLanguageExemplarsByLang({});
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const exemplars =
    languageFilter && languageExemplarsByLang[languageFilter]
      ? languageExemplarsByLang[languageFilter]
      : baseExemplars;

  const filteredExemplars = exemplars.filter((exemplar) => {
    const matchesSearch =
      exemplar.title.toLowerCase().includes(search.toLowerCase()) ||
      exemplar.subject.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType ? exemplar.type === filterType : true;
    const matchesSubject = subjectFilter !== null ? exemplar.subjectId === subjectFilter : true;
    const matchesGrade = gradeFilter.length > 0 ? gradeFilter.includes(exemplar.score) : true;
    return matchesSearch && matchesType && matchesSubject && matchesGrade;
  });

  const visibleExemplars = filteredExemplars.slice(0, visibleCount);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Reset visible count when filters or search change
    setVisibleCount(24);
  }, [search, filterType, subjectFilter, languageFilter, gradeFilter.join(",")]);

  const selectedSubjectTitle = subjectFilter !== null ? ibSubjects.find((subject) => subject.id === subjectFilter)?.title ?? "Select subject" : "Select subject";

  const selectedLanguage =
    languageFilter !== null
      ? LANGUAGE_OPTIONS.find((lang) => lang.code === languageFilter)
      : null;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;

        setVisibleCount((prev) =>
          prev < filteredExemplars.length
            ? Math.min(prev + 24, filteredExemplars.length)
            : prev,
        );
      },
      {
        root: null,
        rootMargin: "200px 0px",
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [filteredExemplars.length]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <main className="w-full overflow-hidden overflow-y-auto overscroll-none bg-background focus:outline-none mx-auto h-full border-border border-t-2 md:rounded-2xl md:border-2 relative p-0!">
        <div className="md:max-w-3xl lg:max-w-4xl xl:max-w-5xl isolate mx-auto w-full px-4 pt-12 pb-16 sm:px-6 sm:pt-20 lg:px-8 max-w-none! p-0!">
          <div
            className="-z-10 absolute inset-x-0 top-0 flex h-48 items-center overflow-hidden md:inset-x-0"
            style={{ transform: "translateZ(0px)", willChange: "opacity" }}
          >
            <img
              alt=""
              width="640"
              height="192"
              decoding="async"
              className="h-full w-full scale-110 rounded-2xl object-cover opacity-50 saturate-125"
              src="https://assets.revisiondojo.com/assets/images/banners/banner-coursework-exemplar.svg"
              style={{ color: "transparent", transform: "translateZ(0px)" }}
            />
            <div className="absolute inset-x-0 top-0 bottom-0 bg-linear-to-t from-background via-background/50 to-transparent bg-gradient-to-t"></div>
          </div>

          <div className="mx-auto w-full max-w-7xl px-4">
            <div className="mt-24 space-y-6">
              <div className="pt-12 pb-8">
                <h1 className="h0 mb-4 text-center font-title text-4xl font-bold tracking-tight">IA/EE/TOK Exemplars</h1>
                <p className="mx-auto w-full max-w-2xl text-balance text-center text-muted-foreground text-xl">
                  Thousands of past student coursework, with scores verified by IB examiners.
                </p>
              </div>

              <div className="mx-auto w-full max-w-4xl">
                <div className="rounded-3xl p-2 shadow-xl ring-2 ring-foreground/10">
                  <div className="flex w-full items-center gap-2">
                    <div className="flex-1 rounded-2xl bg-muted focus-within:ring-2 focus-within:ring-foreground">
                      <div className="flex items-center gap-2 pr-2">
                        <div className="relative flex-1">
                          <HiSearch className="-translate-y-1/2 absolute top-1/2 left-4 size-6 transform text-muted-foreground" aria-hidden="true" />
                          <input
                            className="w-full bg-transparent py-3 pr-4 pl-12 text-foreground text-lg placeholder:text-muted-foreground focus:outline-none"
                            placeholder="Search exemplars by content, topic, or keywords..."
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <button className="inline-flex items-center justify-center ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 w-fit px-5 py-3 font-medium text-lg rounded-2xl bg-accent-primary-foreground text-background focus-visible:ring-accent-primary-foreground/50">
                      Search
                    </button>
                  </div>
                  <div className="space-y-4 mt-2 px-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium text-muted-foreground text-sm">
                        Filter by:
                      </span>
                      <div className="flex gap-2">
                        {["IA", "EE", "TOK"].map((type) => {
                          const isActive = filterType === type;
                          return (
                            <button
                              key={type}
                              className={cn("rounded-xl px-3 py-1 font-medium text-sm transition-all", isActive ? "bg-accent-primary text-accent-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted")}
                              onClick={() => setFilterType(filterType === type ? null : type)}
                              type="button"
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                      <div className="min-w-[200px]">
                        <Popover
                          open={isSubjectOpen}
                          onOpenChange={setIsSubjectOpen}
                        >
                          <PopoverTrigger asChild>
                            <button
                              className="inline-flex h-8 w-full min-w-[200px] items-center justify-between rounded-2xl bg-muted px-5 py-3 text-base font-medium text-muted-foreground ring-offset-background transition-all hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
                              type="button"
                            >
                              <span className="flex-1 truncate text-left">
                                {selectedSubjectTitle}
                              </span>
                              <HiChevronDown className="ml-2 size-5 shrink-0 opacity-50" />
                            </button>
                          </PopoverTrigger>
                              <PopoverContent className="w-72 p-0">
                            <Command>
                              <div className="p-1">
                                <CommandSearchInput placeholder="Search..." />
                              </div>
                              <CommandList>
                                <CommandGroup>
                                  {ibSubjects.map((subject) => (
                                    <CommandItem
                                      key={subject.slug}
                                      value={subject.title}
                                      onSelect={(currentValue) => {
                                        const selected = ibSubjects.find((s) => s.title === currentValue,);
                                        if (selected) {
                                          setSubjectFilter((prev) => prev === selected.id ? null : selected.id);
                                        }
                                        setIsSubjectOpen(false);
                                      }}
                                    >
                                      <span className="truncate-1 flex-1">
                                        {subject.title}
                                      </span>
                                      <HiCheck
                                        className={cn(
                                          "ml-2 size-5 shrink-0",
                                          subjectFilter === subject.id
                                            ? "opacity-100"
                                            : "opacity-0",
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
                      <div className="min-w-[200px]">
                        <Popover
                          open={isLanguageOpen}
                          onOpenChange={setIsLanguageOpen}
                        >
                          <PopoverTrigger asChild>
                            <button
                              className="inline-flex h-8 w-full min-w-[200px] items-center justify-between rounded-2xl bg-muted px-5 py-3 text-base font-medium text-muted-foreground ring-offset-background transition-all hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
                              type="button"
                            >
                              <span className="flex items-center gap-2 truncate text-left">
                                {selectedLanguage ? (
                                  <>
                                    <LanguageFlag Flag={selectedLanguage.Flag} />
                                    <span>{selectedLanguage.name}</span>
                                  </>
                                ) : (
                                  "Select language"
                                )}
                              </span>
                              <HiChevronDown className="ml-2 size-5 shrink-0 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-0">
                            <Command>
                              <div className="p-1">
                                <CommandSearchInput placeholder="Search..." />
                              </div>
                              <CommandList>
                                <CommandGroup>
                                  {LANGUAGE_OPTIONS.map((language) => (
                                    <CommandItem
                                      key={language.code}
                                      value={`${language.code} ${language.name}`}
                                      onSelect={() => {
                                        setLanguageFilter((prev) =>
                                          prev === language.code ? null : language.code,
                                        );
                                        setIsLanguageOpen(false);
                                      }}
                                    >
                                      <div className="flex w-full items-center gap-2">
                                        <LanguageFlag Flag={language.Flag} />
                                        <span className="flex-1 truncate">
                                          {language.name}
                                        </span>
                                        <HiCheck
                                          className={cn(
                                            "ml-2 size-5 shrink-0",
                                            languageFilter === language.code
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    {(filterType || subjectFilter !== null || languageFilter !== null || gradeFilter.length > 0) && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground text-sm">Active filters:</span>
                        {filterType && (
                          <div className="flex items-center gap-1 rounded-full bg-accent-primary px-3 py-1 text-accent-primary-foreground text-sm">
                            <span>{`Type: ${filterType}`}</span>
                            <button
                              className="ml-1 rounded-full p-0.5 hover:bg-black/10"
                              type="button"
                              onClick={() => setFilterType(null)}
                            >
                              <HiX className="size-3" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                        {subjectFilter !== null && (
                          <div className="flex items-center gap-1 rounded-full bg-accent-primary px-3 py-1 text-accent-primary-foreground text-sm">
                            <span>{`Subject: ${selectedSubjectTitle}`}</span>
                            <button
                              className="ml-1 rounded-full p-0.5 hover:bg-black/10"
                              type="button"
                              onClick={() => setSubjectFilter(null)}
                            >
                              <HiX className="size-3" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                        {languageFilter !== null && selectedLanguage && (
                          <div className="flex items-center gap-1 rounded-full bg-accent-primary px-3 py-1 text-accent-primary-foreground text-sm">
                            <span>{`Language: ${selectedLanguage.name}`}</span>
                            <button
                              className="ml-1 rounded-full p-0.5 hover:bg-black/10"
                              type="button"
                              onClick={() => setLanguageFilter(null)}
                            >
                              <HiX className="size-3" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                        {gradeFilter.map((grade) => (
                          <div className="flex items-center gap-1 rounded-full bg-accent-primary px-3 py-1 text-accent-primary-foreground text-sm" key={grade}>
                            <span>{`Grade: ${grade}`}</span>
                            <button
                              className="ml-1 rounded-full p-0.5 hover:bg-black/10"
                              type="button"
                              onClick={() => setGradeFilter((prev) => prev.filter((g) => g !== grade))}
                            >
                              <HiX className="size-3" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8 pt-16 lg:flex-row">
                
                <div className="w-full lg:order-2 lg:w-80">
                  <div className="space-y-6 lg:sticky lg:top-8">
                    <div className="space-y-3">
                      <h3 className="h4 font-title text-foreground font-bold">Type</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {["IA", "EE", "TOK"].map((type) => {
                          const isActive = filterType === type;
                          return (
                            <button
                              key={type}
                              className={cn("flex items-center justify-center gap-2 rounded-xl border-2 p-3 font-medium text-base transition-all", isActive ? "border-accent-primary-foreground bg-accent-primary text-accent-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted")}
                              onClick={() => setFilterType(filterType === type ? null : type)}
                              type="button"
                            >
                              {type}
                              {isActive && (
                                <HiCheckCircle
                                  className="size-5"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="h4 font-title text-foreground font-bold">Subject</h3>
                      <Popover
                        open={isSidebarSubjectOpen}
                        onOpenChange={setIsSidebarSubjectOpen}
                      >
                        <PopoverTrigger asChild>
                          <button
                            className="inline-flex items-center ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 px-5 py-3 font-medium bg-muted text-muted-foreground hover:bg-border hover:text-foreground focus-visible:ring-muted-foreground/50 min-w-[200px] justify-between rounded-2xl text-base w-full"
                            type="button"
                          >
                            <span className="flex-1 truncate text-left">
                              {selectedSubjectTitle}
                            </span>
                            <HiChevronDown className="ml-2 size-5 shrink-0 opacity-50" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0">
                          <Command>
                            <div className="p-1">
                              <CommandSearchInput placeholder="Search..." />
                            </div>
                            <CommandList>
                              <CommandGroup>
                                {ibSubjects.map((subject) => (
                                  <CommandItem
                                    key={subject.slug}
                                    value={subject.title}
                                    onSelect={(currentValue) => {
                                      const selected = ibSubjects.find(
                                        (s) => s.title === currentValue,
                                      );
                                      if (selected) {
                                        setSubjectFilter((prev) =>
                                          prev === selected.id ? null : selected.id,
                                        );
                                      }
                                      setIsSidebarSubjectOpen(false);
                                    }}
                                  >
                                    <span className="truncate-1 flex-1">
                                      {subject.title}
                                    </span>
                                    <HiCheck
                                      className={cn(
                                        "ml-2 size-5 shrink-0",
                                        subjectFilter === subject.id
                                          ? "opacity-100"
                                          : "opacity-0",
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

                    <div className="space-y-3">
                      <h3 className="h4 font-title text-foreground font-bold">Language</h3>
                      <Popover
                        open={isSidebarLanguageOpen}
                        onOpenChange={setIsSidebarLanguageOpen}
                      >
                        <PopoverTrigger asChild>
                          <button
                            className="inline-flex items-center ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 px-5 py-3 font-medium bg-muted text-muted-foreground hover:bg-border hover:text-foreground focus-visible:ring-muted-foreground/50 min-w-[200px] justify-between rounded-2xl text-base w-full"
                            type="button"
                          >
                            <span className="flex items-center gap-2 truncate text-left">
                              {selectedLanguage ? (
                                <>
                                  <LanguageFlag Flag={selectedLanguage.Flag} />
                                  <span>{selectedLanguage.name}</span>
                                </>
                              ) : (
                                "Select language"
                              )}
                            </span>
                            <HiChevronDown className="ml-2 size-5 shrink-0 opacity-50" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0">
                          <Command>
                            <div className="p-1">
                              <CommandSearchInput placeholder="Search..." />
                            </div>
                            <CommandList>
                              <CommandGroup>
                                {LANGUAGE_OPTIONS.map((language) => (
                                  <CommandItem
                                    key={language.code}
                                    value={`${language.code} ${language.name}`}
                                    onSelect={() => {
                                      setLanguageFilter((prev) =>
                                        prev === language.code ? null : language.code,
                                      );
                                      setIsSidebarLanguageOpen(false);
                                    }}
                                  >
                                    <div className="flex w-full items-center gap-2">
                                      <LanguageFlag Flag={language.Flag} />
                                      <span className="flex-1 truncate">
                                        {language.name}
                                      </span>
                                      <HiCheck
                                        className={cn(
                                          "ml-2 size-5 shrink-0",
                                          languageFilter === language.code
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground">Grade</h3>
                      <div className="space-y-2">
                        <div className="grid gap-2 grid-cols-3">
                          {["A", "B", "C", "D", "E"].map((grade) => {
                            const isActive = gradeFilter.includes(grade);
                            return (
                              <button
                                key={grade}
                                className={cn("flex items-center justify-center gap-2 rounded-xl border-2 p-3 font-medium text-base transition-all", isActive ? "border-accent-primary-foreground bg-accent-primary text-accent-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted")}
                                type="button"
                                onClick={() => setGradeFilter((prev) => prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade])}
                              >
                                {grade}
                                {isActive && (
                                  <HiCheckCircle
                                    className="size-5"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-2 gap-y-8 xl:grid-cols-3">
                      {visibleExemplars.map((exemplar) => (
                        <ExemplarCard key={exemplar.id} {...exemplar} />
                      ))}
                    </div>
                  </div>
                  
                  {/* infinite scroll */}
                  <div ref={loadMoreRef} className="mt-6 flex justify-center pb-24 text-xs text-muted-foreground" aria-hidden="true"></div>
                </div>

              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
