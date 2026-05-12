import { Streamdown } from "streamdown";
import rehypeKatex from "rehype-katex";
import { CentralIcon } from "@central-icons-react/all";
import type { Element } from "hast";
import { NOTES_REMARK_PLUGINS, NOTES_STREAMDOWN_CONTROLS, getMarkdownFromNodeRecursive, normalizeBrokenEmphasisMarkdown, normalizeLatexDelimiters } from "@/components/notes/rendering";
import { parseCodeBlocksFromContent, SimpleCodeBlock, RunnableCodeBlock } from "@/components/notes/NotesCodeBlock";

// todo: add all callout types
type CalloutType = "note" | "example" | "tip" | "warning" | "self_review" | "analogy" | "tok" | "hint";

const CALLOUT_BOX_CLASS: Record<string, string> = {
  warning: "my-4 rounded-2xl p-4 pr-6 bg-red-50 dark:bg-red-500/20",
  note: "my-4 rounded-2xl p-4 pr-6 bg-emerald-50 dark:bg-emerald-500/20",
  example: "my-4 rounded-2xl p-4 pr-6 bg-blue-50 dark:bg-blue-500/20",
  analogy: "my-4 rounded-2xl p-4 pr-6 bg-violet-50 dark:bg-violet-500/20",
  tok: "my-4 rounded-2xl p-4 pr-6 bg-indigo-50 dark:bg-indigo-500/20",
  self_review: "my-4 rounded-2xl p-4 pr-6 bg-sky-50 dark:bg-sky-500/20",
  tip: "my-4 rounded-2xl p-4 pr-6 bg-purple-50 dark:bg-purple-500/20",
  hint: "my-4 rounded-2xl p-4 pr-6 bg-purple-50 dark:bg-purple-500/20",
};

const CALLOUT_HEADER_CLASS: Record<string, string> = {
  warning: "flex items-center gap-2 text-red-600 dark:text-red-400",
  note: "flex items-center gap-2 text-emerald-600 dark:text-emerald-400",
  example: "flex items-center gap-2 text-blue-600 dark:text-blue-400",
  analogy: "flex items-center gap-2 text-violet-600 dark:text-violet-400",
  tok: "flex items-center gap-2 text-indigo-600 dark:text-indigo-400",
  self_review: "flex items-center gap-2 text-sky-600 dark:text-sky-400",
  tip: "flex items-center gap-2 text-purple-600 dark:text-purple-400",
  hint: "flex items-center gap-2 text-purple-600 dark:text-purple-400",
};

const CALLOUT_TITLE_CLASS: Record<string, string> = {
  warning: "-mt-0.5 m-0 font-bold font-title text-base text-red-600 dark:text-red-400",
  note: "-mt-0.5 m-0 font-bold font-title text-base text-emerald-600 dark:text-emerald-400",
  example: "-mt-0.5 m-0 font-bold font-title text-base text-blue-600 dark:text-blue-400",
  analogy: "-mt-0.5 m-0 font-bold font-title text-base text-violet-600 dark:text-violet-400",
  tok: "-mt-0.5 m-0 font-bold font-title text-base text-indigo-600 dark:text-indigo-400",
  self_review: "-mt-0.5 m-0 font-bold font-title text-base text-sky-600 dark:text-sky-400",
  tip: "-mt-0.5 m-0 font-bold font-title text-base text-purple-600 dark:text-purple-400",
  hint: "-mt-0.5 m-0 font-bold font-title text-base text-purple-600 dark:text-purple-400",
};

const CALLOUT_DISPLAY_TITLE: Record<string, string> = {
  warning: "Common Mistake",
  note: "Note",
  example: "Example",
  analogy: "Analogy",
  tok: "TOK",
  self_review: "Self review",
  tip: "Tip",
  hint: "Hint",
};

const CALLOUT_ICON: Record<CalloutType, string> = {
  warning: "IconExclamationCircle",
  note: "IconNote1",
  example: "IconCircleInfo",
  analogy: "IconLightbulbGlow",
  tok: "IconBook",
  self_review: "IconSquareChecklist",
  tip: "IconZap",
  hint: "IconLightBulbSimple",
};

export default function CalloutBlock(props: { node?: Element; children?: React.ReactNode; type?: CalloutType; content?: string }) {
  const type = props.type ?? (((props.node?.properties?.type as string) ?? "note")) as CalloutType;
  const boxClass = CALLOUT_BOX_CLASS[type] ?? CALLOUT_BOX_CLASS.note;
  const headerClass = CALLOUT_HEADER_CLASS[type] ?? CALLOUT_HEADER_CLASS.note;
  const titleClass = CALLOUT_TITLE_CLASS[type] ?? CALLOUT_TITLE_CLASS.note;
  const title = CALLOUT_DISPLAY_TITLE[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const iconName = CALLOUT_ICON[type] ?? "IconCircleInfo";
  
  const rawContent = props.content ?? getMarkdownFromNodeRecursive(props.node).trim();
  // Strip trailing standalone heading markers (e.g. "###") so they don't render as empty <h3> with extra bottom margin. maybe connect them with the next line? experimentation needed
  const trimmedContent = rawContent.replace(/\n\n\s*#+\s*$/g, "").trim();

  if (!trimmedContent.trim()) return null;

  const segments = parseCodeBlocksFromContent(trimmedContent);
  const hasCodeBlocks = segments.some((s) => s.type !== "markdown");

  return (
    <div className={boxClass} data-callout-type={type}>
      <div className={`${headerClass} mb-3`}>
        <span className="text-2xl">
          <CentralIcon name={iconName as Parameters<typeof CentralIcon>[0]["name"]} fill="filled" join="round" stroke="2" radius="2" size={24} ariaHidden />
        </span>
        <span className={titleClass}>{title}</span>
      </div>
      <div className="callout-body sanity-content last:*:mb-0! [&_strong]:font-semibold prose prose-base max-w-none dark:prose-invert">
        {hasCodeBlocks
          ? segments.map((segment, i) => {
              if (segment.type === "simpleCode") {
                return <SimpleCodeBlock key={i} code={segment.code} language={segment.language} />;
              }
              if (segment.type === "runnableCode") {
                return <RunnableCodeBlock key={i} code={segment.code} language={segment.language} output={segment.output} />;
              }
              const normalizedContent = normalizeLatexDelimiters(normalizeBrokenEmphasisMarkdown(segment.content));
              if (!normalizedContent.trim()) return null;
              return (
                <Streamdown
                  key={i}
                  mode="static"
                  remarkPlugins={NOTES_REMARK_PLUGINS}
                  rehypePlugins={[rehypeKatex]}
                  controls={NOTES_STREAMDOWN_CONTROLS}
                >
                  {normalizedContent}
                </Streamdown>
              );
            })
          : (
            <Streamdown
              mode="static"
              remarkPlugins={NOTES_REMARK_PLUGINS}
              rehypePlugins={[rehypeKatex]}
              controls={NOTES_STREAMDOWN_CONTROLS}
            >
              {normalizeLatexDelimiters(normalizeBrokenEmphasisMarkdown(trimmedContent))}
            </Streamdown>
          )}
      </div>
    </div>
  );
}
