import { useId, useState } from "react";
import { Streamdown } from "streamdown";
import rehypeKatex from "rehype-katex";
import { HiChevronDown, HiQuestionMarkCircle } from "react-icons/hi";
import type { Element } from "hast";
import { NOTES_REMARK_PLUGINS, NOTES_STREAMDOWN_CONTROLS, getTextFromNodeRecursive, normalizeBrokenEmphasisMarkdown, normalizeLatexDelimiters } from "@/components/notes/rendering";

// ripped straight from revisiondojo

function getElementChild(node: Element | undefined, tagName: string): Element | undefined {
  if (!node?.children) return undefined;
  const lower = tagName.toLowerCase();
  return node.children.find(
    (child): child is Element => "tagName" in child && (child as Element).tagName?.toLowerCase() === lower
  ) as Element | undefined;
}

function decodeDataAttr(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    return "";
  }
}

export default function ExampleQuestionBlock(props: {
  node?: Element;
  children?: React.ReactNode;
  question?: string;
  answer?: string;
}) {
  const attrs = props.node?.properties ?? {};
  const dataQuestion = decodeDataAttr(attrs["data-question"]);
  const dataAnswer = decodeDataAttr(attrs["data-answer"]);

  const questionEl = getElementChild(props.node, "question");
  const answerEl = getElementChild(props.node, "answer");
  const questionFromNode = getTextFromNodeRecursive(questionEl).trim();
  const answerFromNode = getTextFromNodeRecursive(answerEl).trim();

  const question = normalizeLatexDelimiters(normalizeBrokenEmphasisMarkdown(props.question ?? (dataQuestion || questionFromNode))).trim();
  const answer = normalizeLatexDelimiters(normalizeBrokenEmphasisMarkdown(props.answer ?? (dataAnswer || answerFromNode))).trim();

  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const regionId = useId();

  const hasContent = !!(question || answer || props.children);
  if (!hasContent) return null;

  return (
    <div className="my-4 not-prose" data-orientation="vertical">
      <div
        data-state={open ? "open" : "closed"}
        data-orientation="vertical"
        className="overflow-hidden rounded-2xl border-2 border-blue-200 dark:border-blue-500/20"
      >
        <div className="flex items-center gap-2 px-4 py-4 text-blue-600 dark:text-blue-400">
          <span className="text-2xl">
            <HiQuestionMarkCircle aria-hidden className="size-6" />
          </span>
          <span className="font-semibold font-title text-base">Example question</span>
        </div>

        <div className="px-4 pb-4">
          <div className="example-question-body prose prose-base max-w-none dark:prose-invert">
            {question ? (
              <Streamdown
                mode="static"
                remarkPlugins={NOTES_REMARK_PLUGINS}
                rehypePlugins={[rehypeKatex]}
                controls={NOTES_STREAMDOWN_CONTROLS}
              >
                {question}
              </Streamdown>
            ) : (
              props.children
            )}
          </div>
        </div>

        {(answer || question) ? (
          <>
            <div
              id={regionId}
              role="region"
              aria-labelledby={triggerId}
              data-state={open ? "open" : "closed"}
              data-orientation="vertical"
              className={`border-blue-200 border-t-2 p-4 dark:border-blue-500/20 ${open ? "block" : "hidden"}`}
            >
              <p className="mb-4 mt-0 font-title text-base font-semibold">Solution</p>
              <div className="example-question-body prose prose-base max-w-none dark:prose-invert">
                {answer ? (
                  <Streamdown
                    mode="static"
                    remarkPlugins={NOTES_REMARK_PLUGINS}
                    rehypePlugins={[rehypeKatex]}
                    controls={NOTES_STREAMDOWN_CONTROLS}
                  >
                    {answer}
                  </Streamdown>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              id={triggerId}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={regionId}
              data-state={open ? "open" : "closed"}
              data-orientation="vertical"
              className="group w-full border-blue-200 border-t-2 bg-blue-100 px-4 py-3 text-blue-600 transition-all hover:bg-blue-200 dark:border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30"
            >
              <div className="flex items-center justify-center gap-2">
                <HiChevronDown
                  aria-hidden
                  className={`h-5 w-5 shrink-0 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
                <span className="font-medium text-sm">{open ? "Hide answer" : "Show answer"}</span>
              </div>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
