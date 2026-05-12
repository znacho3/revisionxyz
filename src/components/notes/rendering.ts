import { defaultRemarkPlugins } from "streamdown";
import remarkMath from "remark-math";
import type { Element } from "hast";
import { visit } from "unist-util-visit";

function getPlainText(node: any): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (Array.isArray(node.children)) return node.children.map((c: any) => getPlainText(c)).join("");
  return "";
}

/**
 * Remark plugin: if a paragraph starts with a bold/emphasized phrase
 * that exactly matches the previous heading text, unwrap that bold node.
 * This fixes patterns like:
 *   "Scalar quantities" (heading)
 *   "**Scalar quantities** have only magnitude and no direction."
 */
function remarkUnwrapDuplicateHeadingStrong() {
  return (tree: any) => {
    let lastHeadingText = "";
    visit(tree, (node: any) => {
      if (node.type === "heading") {
        lastHeadingText = getPlainText(node).trim();
        return;
      }
      if (!lastHeadingText || node.type !== "paragraph") return;
      const children = node.children;
      if (!Array.isArray(children) || children.length === 0) return;
      const first = children[0];
      if (first.type !== "strong" && first.type !== "emphasis") return;
      const firstText = getPlainText(first).trim();
      if (!firstText || firstText !== lastHeadingText) return;
      node.children = [...(first.children ?? []), ...children.slice(1)];
    });
  };
}

export const NOTES_REMARK_PLUGINS = [...Object.values(defaultRemarkPlugins), remarkMath, remarkUnwrapDuplicateHeadingStrong];
export const NOTES_STREAMDOWN_CONTROLS = { table: false } as const;

export function normalizeBrokenEmphasisMarkdown(markdown: string): string {
  let result = "";
  let index = 0;

  while (index < markdown.length) {
    const start = markdown.indexOf("**", index);
    if (start === -1) {
      result += markdown.slice(index);
      break;
    }

    const end = markdown.indexOf("**", start + 2);
    if (end === -1) {
      result += markdown.slice(index);
      break;
    }

    result += markdown.slice(index, start);

    const inner = markdown.slice(start + 2, end);
    const leadingWhitespace = inner.match(/^\s+/)?.[0] ?? "";
    const trailingWhitespace = inner.match(/\s+$/)?.[0] ?? "";
    const core = inner.trim();

    if (!core) {
      result += markdown.slice(start, end + 2);
    } else {
      result += `${leadingWhitespace}**${core}**${trailingWhitespace}`;
    }

    index = end + 2;
  }

  return result;
}

export function normalizeLatexDelimiters(markdown: string): string {
  return markdown
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, "$$\n$1\n$$")
    .replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_match, expr: string) => `$${expr.trim()}$`)
    // RevisionDojo source often stores display equations as a single line:
    // $$ ... $$
    // remark-math only treats multiline fences as block math, so convert
    // line-isolated expressions into fenced display math.
    .replace(/^([ \t]*)\$\$([^\n]+?)\$\$[ \t]*$/gm, (_match, indent: string, expr: string) => {
      const trimmed = expr.trim();
      return `${indent}$$\n${indent}${trimmed}\n${indent}$$`;
    });
}

export function getTextFromNode(node: Element | undefined): string {
  if (!node?.children) return "";
  return node.children
    .map((child) => ("value" in child && typeof child.value === "string" ? child.value : ""))
    .join("");
}

// hast nodes: data structure used to represent html in syntax tree
type HastNode = { value?: string; children?: HastNode[]; tagName?: string };

/** Recursively serialize hast to markdown so inline formatting (strong, em, code) is preserved. */
export function getMarkdownFromNodeRecursive(node: HastNode | undefined): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (!Array.isArray(node.children)) return "";
  const inner = node.children.map((c) => getMarkdownFromNodeRecursive(c)).join("");
  const tag = (node as Element).tagName;
  if (tag === "strong") return `**${inner}**`;
  if (tag === "em" || tag === "i") return `*${inner}*`;
  if (tag === "code") return `\`${inner}\``;
  return inner;
}

/** recursively extract text from hast node (for nested content). */
export function getTextFromNodeRecursive(node: HastNode | undefined): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (Array.isArray(node.children)) return node.children.map((c) => getTextFromNodeRecursive(c)).join("");
  return "";
}
