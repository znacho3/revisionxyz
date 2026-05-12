import { Children, Fragment, isValidElement, useEffect, useState, useMemo } from "react";
import { createFileRoute, useParams, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Streamdown } from "streamdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { harden as rehypeHarden } from "rehype-harden";
import ChildNotesList from "@/components/subject/ChildNotesList";
import SubjectBackground from "@/components/subject/SubjectBackground";
import TopicModeTabs from "@/components/subject/TopicModeTabs";
import CalloutBlock from "@/components/notes/CalloutBlock";
import DefinitionBlock from "@/components/notes/DefinitionBlock";
import ExampleQuestionBlock from "@/components/notes/ExampleQuestionBlock";
import { parseCodeBlocksFromContent, SimpleCodeBlock, RunnableCodeBlock } from "@/components/notes/NotesCodeBlock";
import { NOTES_REMARK_PLUGINS, NOTES_STREAMDOWN_CONTROLS, normalizeBrokenEmphasisMarkdown, normalizeLatexDelimiters } from "@/components/notes/rendering";
import type { NotesIndexTopic } from "@/types/notesIndex";
import { supabase } from "@/lib/supabase";
import "katex/dist/katex.min.css";
import "@/notes.css";

/** sanitize schema to keep default tags and add custom blocks */
const NOTES_REHYPE_SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "callout", "definition", "example_question", "example-question", "question", "answer", "embed", "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    callout: ["type"],
    definition: ["term"],
    "example-question": ["data-question", "data-answer"],
    example_question: ["data-question", "data-answer"],
    embed: ["type", "url"],
    iframe: ["src", "title", "width", "height", "allow", "allowfullscreen", "loading", "referrerpolicy"],
  },
};

/** rehype is used to parse raw HTML, sanitize (with our tags), harden, then KaTeX. */
const NOTES_REHYPE_PLUGINS: Parameters<typeof Streamdown>[0]["rehypePlugins"] = [
  rehypeRaw,
  [rehypeSanitize, NOTES_REHYPE_SCHEMA],
  [rehypeHarden, { allowedImagePrefixes: ["*"], allowedLinkPrefixes: ["*"], allowedProtocols: ["*"], allowDataImages: true }],
  rehypeKatex,
];

function NotesBlockquote(props: { children?: React.ReactNode }) {
  return <blockquote>{props.children}</blockquote>;
}

function NotesEmbed(props: {
  children?: React.ReactNode;
  url?: string;
  src?: string;
  title?: string;
  allow?: string;
  loading?: "lazy" | "eager";
  referrerPolicy?: React.IframeHTMLAttributes<HTMLIFrameElement>["referrerPolicy"];
}) {
  const src = props.url ?? props.src;
  if (!src) return null;

  const title =
    props.title ??
    (typeof props.children === "string" && props.children.trim()
      ? props.children.trim()
      : "Interactive notes embed");

  return (
    <div className="notes-embed not-prose my-6 overflow-hidden rounded-2xl border border-border bg-card">
      <iframe
        src={src}
        title={title}
        allow={props.allow ?? "fullscreen"}
        loading={props.loading ?? "lazy"}
        referrerPolicy={props.referrerPolicy ?? "strict-origin-when-cross-origin"}
        className="notes-embed-frame"
      />
    </div>
  );
}

function NotesParagraph(props: { children?: React.ReactNode }) {
  const children = Children.toArray(props.children);
  const hasBlockChild = children.some((child) => {
    if (!isValidElement(child)) return false;
    // Treat custom blocks and Streamdown's block-level wrappers as block children so they arent wrapped in a p tag
    if (
      child.type === CalloutBlock ||
      child.type === DefinitionBlock ||
      child.type === NotesBlockquote ||
      child.type === ExampleQuestionBlock ||
      child.type === NotesEmbed
    ) {
      return true;
    }
    // render streamdown images as <div data-streamdown="image-wrapper">…</div> or <figure class="notes-figure">
    if (typeof child.type === "string" && child.type === "div") {
      const childProps = child.props as Record<string, unknown>;
      if (childProps["data-streamdown"] === "image-wrapper" || childProps["data-streamdown-wrapper"] === "true") {
        return true;
      }
    }
    if (typeof child.type === "string" && child.type === "figure") { /* only for images so they look correct */
      const childProps = child.props as Record<string, unknown>;
      if (typeof childProps.className === "string" && childProps.className.includes("notes-figure")) {
        return true;
      }
    }
    // display math without ptag
    if (typeof child.type === "string" && child.type === "span") {
      const className = (child.props as Record<string, unknown>).className;
      if (typeof className === "string" && className.includes("katex-display")) return true;
    }
    return false;
  });

  if (hasBlockChild) return <>{props.children}</>;

  return <p>{props.children}</p>;
}

function NotesImage(props: React.ImgHTMLAttributes<HTMLImageElement> & { node?: unknown }) {
  const { node: _node, alt, ...imgProps } = props;
  const caption = typeof alt === "string" && alt.trim() ? alt.trim() : null;
  return (
    <figure className="notes-figure my-6">
      <img {...imgProps} alt={alt ?? ""} className="rounded-[var(--radius)] block max-w-full h-auto" />
      {caption && (
        <figcaption className="notes-figcaption mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

const NOTES_COMPONENTS = {
  callout: CalloutBlock,
  definition: DefinitionBlock,
  blockquote: NotesBlockquote,
  embed: NotesEmbed,
  iframe: NotesEmbed,
  p: NotesParagraph,
  img: NotesImage,
};

type NoteInfo = { topictitle?: string; topicslug?: string; parenttitle?: string | null; parentslug?: string | null };
type NoteData = {
  info: NoteInfo;
  markdown?: string;
  prevtopic?: { slug: string; title: string } | null;
  nexttopic?: { slug: string; title: string } | null;
};

type NotesSection =
  | { type: "markdown"; content: string }
  | { type: "exampleQuestion"; question: string; answer: string }
  | { type: "callout"; calloutType: string; content: string };

// this was hell
function parseExampleQuestionInner(inner: string): { question: string; answer: string } | null {
  const questionMatch = /<\s*question\s*>([\s\S]*?)<\s*\/\s*question\s*>/i.exec(inner);
  if (!questionMatch) return null;
  const answerMatch = /<\s*answer\s*>([\s\S]*?)<\s*\/\s*answer\s*>/i.exec(inner);
  return {
    question: questionMatch[1]?.trim() ?? "",
    answer: answerMatch?.[1]?.trim() ?? "",
  };
}

function parseCallouts(markdown: string): NotesSection[] {
  const pattern = /<\s*callout\s+(?:[^>]*?\s+)?type\s*=\s*["']([^"']+)["'](?:[^>]*?)>([\s\S]*?)<\s*\/\s*callout\s*>/gi;
  const sections: NotesSection[] = [];
  let lastIndex = 0;

  for (const match of markdown.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + (match[0]?.length ?? 0);
    const before = markdown.slice(lastIndex, start);
    
    if (before.trim()) {
      sections.push({ type: "markdown", content: before });
    }

    const type = match[1] ?? "note";
    const content = match[2] ?? "";
    sections.push({ type: "callout", calloutType: type, content: content });

    lastIndex = end;
  }

  const trailing = markdown.slice(lastIndex);
  if (trailing.trim()) {
    sections.push({ type: "markdown", content: trailing });
  }

  if (sections.length === 0 && markdown.trim()) {
    sections.push({ type: "markdown", content: markdown });
  }

  return sections;
}

function parseNotesSections(rawMarkdown: string): NotesSection[] {
  const markdown = rawMarkdown
    .replace(/<\s*example-question\s*>/gi, "<example_question>")
    .replace(/<\s*\/\s*example-question\s*>/gi, "</example_question>");
  const pattern = /<\s*example_question\s*>([\s\S]*?)<\s*\/\s*example_question\s*>/gi;
  const intermediateSections: NotesSection[] = [];
  let lastIndex = 0;

  for (const match of markdown.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + (match[0]?.length ?? 0);
    const before = markdown.slice(lastIndex, start);
    if (before.trim()) {
      intermediateSections.push({ type: "markdown", content: before });
    }

    const parsed = parseExampleQuestionInner(match[1] ?? "");
    if (parsed && (parsed.question || parsed.answer)) {
      intermediateSections.push({ type: "exampleQuestion", question: parsed.question, answer: parsed.answer });
    } else if (match[0].trim()) {
      intermediateSections.push({ type: "markdown", content: match[0] });
    }

    lastIndex = end;
  }

  const trailing = markdown.slice(lastIndex);
  if (trailing.trim()) {
    intermediateSections.push({ type: "markdown", content: trailing });
  }

  if (intermediateSections.length === 0 && markdown.trim()) {
    intermediateSections.push({ type: "markdown", content: markdown });
  }

  // Now process callouts in markdown sections
  const sections: NotesSection[] = [];
  for (const section of intermediateSections) {
    if (section.type === "markdown") {
      const calloutSections = parseCallouts(section.content);
      if (calloutSections.length > 0) {
        sections.push(...calloutSections);
      }
    } else {
      sections.push(section);
    }
  }

  return sections;
}

function stripBlockIdsFromLines(text: string): string {
  return text.replace(/\s*\[(block_[a-zA-Z0-9_]+|[a-f0-9]{8,})\]\s*$/gm, "");
}

function normalizeNotesMarkdown(markdown: string): string {
  const withoutBlockIds = stripBlockIdsFromLines(markdown);
  const normalizedEmphasis = normalizeBrokenEmphasisMarkdown(withoutBlockIds);
  const normalizedLatex = normalizeLatexDelimiters(normalizedEmphasis);
  const lines = normalizedLatex.split("\n");
  const normalizedIndentation = lines.map((line) => {
    if (/^ {2}(?:\d+\.\s|[-+*]\s)/.test(line)) return `  ${line}`;
    return line;
  });

  return normalizedIndentation.join("\n");
}

export const Route = createFileRoute('/ib/$subject/$noteslug/notes')({
  component: NotePage,
})

function NotePage() {
  const { subject: subjectSlug, noteslug } = useParams({ strict: false });
  const navigate = useNavigate();
  const [note, setNote] = useState<NoteData | null>(null);
  const [childRows, setChildRows] = useState<{ topic_slug: string; topic_title: string | null }[]>([]);
  const [subjectTitle, setSubjectTitle] = useState<string>("");
  const [coverImageUrl, setCoverImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectSlug || !noteslug) { navigate({ to: '/ib', replace: true }); return; }
    setNote(null);
    setChildRows([]);
    setLoading(true);
    Promise.all([
      supabase.from("subjects").select("title, cover_image_url").eq("slug", subjectSlug).single(),
      supabase.from("notes").select("*").eq("subject_slug", subjectSlug).eq("topic_slug", noteslug).maybeSingle(),
      supabase.from("notes").select("topic_slug, topic_title").eq("subject_slug", subjectSlug).eq("parent_slug", noteslug),
    ]).then(([{ data: subRow }, { data: noteRow }, { data: children }]) => {
      if (subRow?.title) setSubjectTitle(subRow.title);
      if (subRow?.cover_image_url) setCoverImageUrl(subRow.cover_image_url);
      if (noteRow) {
        setNote({
          info: {
            topictitle: noteRow.topic_title ?? undefined,
            topicslug: noteRow.topic_slug ?? undefined,
            parenttitle: noteRow.parent_title,
            parentslug: noteRow.parent_slug,
          },
          markdown: noteRow.markdown ?? "",
          prevtopic: noteRow.prev_topic ?? null,
          nexttopic: noteRow.next_topic ?? null,
        });
      }
      setChildRows(children ?? []);
      setLoading(false);
      if (!noteRow && (!children || children.length === 0)) {
        navigate({ to: '/ib', replace: true });
      }
    }).catch(() => { setLoading(false); navigate({ to: '/ib', replace: true }); });
  }, [subjectSlug, noteslug, navigate]);

  const currentIndexNode: NotesIndexTopic | null = useMemo(() => {
    if (!noteslug) return null;
    return {
      slug: noteslug,
      title: note?.info?.topictitle ?? noteslug,
      children: childRows.map((c) => ({ slug: c.topic_slug, title: c.topic_title ?? c.topic_slug, children: [] })),
    };
  }, [noteslug, note, childRows]);

  if (!subjectSlug || !noteslug) return <Navigate to="/ib" replace={true} />;

  const childrenForList = currentIndexNode?.children ?? [];
  const hasChildList = subjectSlug && childrenForList.length > 0;
  const nothingToShow = !loading && note === null && !hasChildList;
  if (nothingToShow) return <Navigate to="/ib" replace={true} />;

  if (loading) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-muted-foreground">Loading note…</p>
      </div>
    );
  }

  const title = note?.info?.topictitle ?? currentIndexNode?.title ?? "Notes";
  const sections = parseNotesSections(note?.markdown ?? "");

  return (
    <div className="relative z-0 w-full">
      {coverImageUrl ? <SubjectBackground coverImageUrl={coverImageUrl} /> : null}
      <div className="relative z-10 md:max-w-xl mx-auto w-full px-4 lg:pt-12 sm:px-6 py-8 sm:pt-20 lg:px-8 lg:max-w-4xl">
        <nav aria-label="breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 break-words font-medium text-muted-foreground sm:gap-1.5">
            <li><Link className="transition-colors hover:text-foreground" to="/ib">IB</Link></li>
            <li aria-hidden className="[&>svg]:size-5" role="presentation">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 20 20" aria-hidden className="size-5" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              {subjectSlug ? (
                <Link className="transition-colors hover:text-foreground" to="/ib/$subject" params={{ subject: subjectSlug }}>{subjectTitle}</Link>
              ) : (
                <span className="font-medium text-foreground">{subjectTitle}</span>
              )}
            </li>
            <li aria-hidden className="[&>svg]:size-5" role="presentation">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 20 20" aria-hidden className="size-5" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li aria-current="page" className="font-medium text-foreground">{title}</li>
          </ol>
        </nav>
        <header className="mt-4 mb-6">
          <h1 className="font-manrope text-4xl font-bold tracking-tight">{title}</h1>
        </header>
        <div className="mb-6"><TopicModeTabs activeId="notes" /></div>
        {!hasChildList && note && sections.length > 0 && (
          <div className="notes-content prose prose-neutral prose-base max-w-none leading-relaxed dark:prose-invert">
            {sections.map((section, index) => {
              if (section.type === "exampleQuestion") {
                return <ExampleQuestionBlock key={`example-question-${index}`} question={section.question} answer={section.answer} />;
              }
              if (section.type === "callout") {
                return (
                  <CalloutBlock 
                    key={`callout-${index}`} 
                    type={section.calloutType as any} 
                    content={normalizeNotesMarkdown(section.content)} 
                  />
                );
              }
              {
                const normalized = normalizeNotesMarkdown(section.content);
                const segments = parseCodeBlocksFromContent(normalized);
                const hasCode = segments.some((s) => s.type !== "markdown");
                if (hasCode) {
                  return (
                    <Fragment key={`markdown-${index}`}>
                      {segments.map((seg, j) => {
                        if (seg.type === "simpleCode") {
                          return <SimpleCodeBlock key={j} code={seg.code} language={seg.language} />;
                        }
                        if (seg.type === "runnableCode") {
                          return <RunnableCodeBlock key={j} code={seg.code} language={seg.language} output={seg.output} />;
                        }
                        return (
                          <Streamdown
                            key={j}
                            mode="static"
                            remarkPlugins={NOTES_REMARK_PLUGINS}
                            rehypePlugins={NOTES_REHYPE_PLUGINS}
                            controls={NOTES_STREAMDOWN_CONTROLS}
                            components={NOTES_COMPONENTS}
                          >
                            {seg.content}
                          </Streamdown>
                        );
                      })}
                    </Fragment>
                  );
                }
                return (
                  <Streamdown
                    key={`markdown-${index}`}
                    mode="static"
                    remarkPlugins={NOTES_REMARK_PLUGINS}
                    rehypePlugins={NOTES_REHYPE_PLUGINS}
                    controls={NOTES_STREAMDOWN_CONTROLS}
                    components={NOTES_COMPONENTS}
                  >
                    {normalized}
                  </Streamdown>
                );
              }
            })}
          </div>
        )}
        {hasChildList && subjectSlug && (
          <div className="mt-8"><ChildNotesList topics={childrenForList} subjectSlug={subjectSlug} /></div>
        )}
        {!hasChildList && note && (note.prevtopic || note.nexttopic) && (
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            {note.prevtopic && subjectSlug ? (
              <Link to="/ib/$subject/$noteslug/notes" params={{ subject: subjectSlug, noteslug: note.prevtopic.slug }} className="text-muted-foreground underline transition-colors hover:text-foreground">← {note.prevtopic.title}</Link>
            ) : <span />}
            {note.nexttopic && subjectSlug ? (
              <Link to="/ib/$subject/$noteslug/notes" params={{ subject: subjectSlug, noteslug: note.nexttopic.slug }} className="text-muted-foreground underline transition-colors hover:text-foreground">{note.nexttopic.title} →</Link>
            ) : <span />}
          </footer>
        )}
      </div>
    </div>
  );
}
