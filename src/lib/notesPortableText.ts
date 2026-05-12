// convert portable text blocks to markdown (callout with pt json innercontent)

type PTSpan = { _type?: string; text?: string; marks?: string[] };
type PTBlock = {
  _type?: string;
  style?: string;
  children?: PTSpan[];
  listItem?: string;
  level?: number;
};

function spanToMarkdown(span: PTSpan): string {
  let t = span.text ?? "";
  const marks = span.marks ?? [];
  for (const m of marks) {
    if (m === "strong") t = `**${t}**`;
    else if (m === "em") t = `*${t}*`;
    else if (m === "code") t = `\`${t}\``;
  }
  return t;
}

function blockToMarkdown(block: PTBlock): string {
  const children = block.children ?? [];
  const line = children.map(spanToMarkdown).join("");
  const style = block.style ?? "normal";
  if (style === "h1") return `# ${line}\n\n`;
  if (style === "h2") return `## ${line}\n\n`;
  if (style === "h3") return `### ${line}\n\n`;
  if (block.listItem === "bullet") return `- ${line}\n`;
  if (block.listItem === "number") return `1. ${line}\n`;
  if (line.trim() === "") return "\n";
  return `${line}\n\n`;
}

export function ptBlocksToMarkdown(blocks: PTBlock[]): string {
  return (blocks ?? []).map(blockToMarkdown).join("");
}
