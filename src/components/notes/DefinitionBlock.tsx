import { Streamdown } from "streamdown";
import rehypeKatex from "rehype-katex";
import { CentralIcon } from "@central-icons-react/all";
import type { Element } from "hast";
import { NOTES_REMARK_PLUGINS, NOTES_STREAMDOWN_CONTROLS, getMarkdownFromNodeRecursive, normalizeBrokenEmphasisMarkdown, normalizeLatexDelimiters } from "@/components/notes/rendering";

function normalizeDefinitionMarkdown(markdown: string): string {
  return normalizeBrokenEmphasisMarkdown(markdown);
}

function fixDefinitionBody(body: string, term: string): string {
  const trimmed = body.trimStart();
  if (!/^A is\s/i.test(trimmed)) return body;
  const termInSentence = term.charAt(0).toLowerCase() + term.slice(1);
  return "A " + termInSentence + " is " + trimmed.slice(5).trimStart();
}

export default function DefinitionBlock(props: { node?: Element; children?: React.ReactNode }) {
  const term = (props.node?.properties?.term as string) ?? "Definition";
  let bodyMarkdown = normalizeDefinitionMarkdown(getMarkdownFromNodeRecursive(props.node).trim());
  bodyMarkdown = fixDefinitionBody(bodyMarkdown, term);
  bodyMarkdown = normalizeLatexDelimiters(bodyMarkdown);

  if (!bodyMarkdown) return null;

  return (
    <div className="not-prose relative my-4 overflow-hidden rounded-2xl bg-pink-50 p-4 dark:bg-pink-500/20 print:break-inside-avoid">
      <div className="mb-3 flex items-center gap-2 text-pink-700 dark:text-pink-400">
        <span className="text-2xl">
          <CentralIcon name="IconTasks" fill="filled" join="round" stroke="2" radius="2" size={24} ariaHidden />
        </span>
        <span className="font-semibold font-title text-base">Definition</span>
      </div>
      <h3 className="mb-3 !mt-0 font-semibold text-xl leading-tight tracking-tight text-foreground">{term}</h3>
      <div className="definition-body prose sanity-content prose-base max-w-none dark:prose-invert">
        <Streamdown
          mode="static"
          remarkPlugins={NOTES_REMARK_PLUGINS}
          rehypePlugins={[rehypeKatex]}
          controls={NOTES_STREAMDOWN_CONTROLS}
        >
          {bodyMarkdown}
        </Streamdown>
      </div>
      <span className="pointer-events-none absolute -bottom-4 -right-4 -rotate-45 text-pink-900/30 dark:text-pink-100/30" aria-hidden>
        <CentralIcon name="IconTasks" fill="filled" join="round" stroke="2" radius="2" size={128} className="opacity-30" />
      </span>
    </div>
  );
}
