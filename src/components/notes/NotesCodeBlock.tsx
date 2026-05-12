import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { HiClipboard, HiCheck, HiChevronDown } from "react-icons/hi";

export type ContentSegment =
  | { type: "markdown"; content: string }
  | { type: "simpleCode"; code: string; language?: string }
  | { type: "runnableCode"; code: string; language: string; output?: string };

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

export function parseCodeBlocksFromContent(content: string): ContentSegment[] {
  const pattern = /<pre(?:\s[^>]*)?>([\s\S]*?)<\/pre>|<code\s+[^>]*isRunnable[^>]*>([\s\S]*?)<\/code>/gi;
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const before = content.slice(lastIndex, start);
    if (before.trim()) {
      segments.push({ type: "markdown", content: before });
    }

    if (match[1] !== undefined) {
      let code = match[1].trim();
      let language = "python";
      const codeTagMatch = /^<code(?:\s+class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*)<\/code>$/i.exec(code);
      if (codeTagMatch) {
        language = codeTagMatch[1] ?? "python";
        code = codeTagMatch[2]?.trim() ?? code;
      }
      segments.push({ type: "simpleCode", code: decodeHtmlEntities(code), language });
    } else if (match[2] !== undefined) {
      const inner = match[2];
      const langMatch = /<codeSnippet\s+language="([^"]+)">([\s\S]*?)<\/codeSnippet>/i.exec(inner);
      const outputMatch = /<expectedOutput>([\s\S]*?)<\/expectedOutput>/i.exec(inner);
      segments.push({
        type: "runnableCode",
        code: decodeHtmlEntities(langMatch?.[2]?.trim() ?? ""),
        language: langMatch?.[1] ?? "python",
        output: outputMatch?.[1]?.trim(),
      });
    }

    lastIndex = end;
  }

  const trailing = content.slice(lastIndex);
  if (trailing.trim()) {
    segments.push({ type: "markdown", content: trailing });
  }

  return segments;
}

export function SimpleCodeBlock({ code, language = "python" }: { code: string; language?: string }) {
  return (
    <div className="my-2 [&_pre]:!m-0 [&_pre]:min-w-fit [&_pre]:!rounded-lg [&_pre]:text-[0.9rem] [&_pre]:leading-[1.5]">
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          borderRadius: "0.5rem",
          fontSize: "0.9rem",
          lineHeight: 1.6,
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export function RunnableCodeBlock({
  code,
  language,
  output,
}: {
  code: string;
  language: string;
  output?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [outputOpen, setOutputOpen] = useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  const displayLanguage = language.charAt(0).toUpperCase() + language.slice(1);

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between bg-background">
        <div className="flex">
          <div className="border-b-2 border-primary px-4 py-3 text-sm font-medium text-primary">
            {displayLanguage}
          </div>
        </div>
        <div className="flex gap-0 pr-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-fit cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground"
          >
            {copied ? (
              <HiCheck className="h-4 w-4" />
            ) : (
              <HiClipboard className="h-4 w-4" />
            )}
            <span className="font-medium">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="[&_pre]:!m-0 [&_pre]:min-w-fit [&_pre]:!rounded-none [&_pre]:text-[0.9rem]">
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: "1rem",
              borderRadius: 0,
              fontSize: "0.9rem",
              lineHeight: 1.6,
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>

      {output && (
        <div className="not-prose border-t border-border">
          <button
            type="button"
            onClick={() => setOutputOpen(!outputOpen)}
            className="flex w-full cursor-pointer items-center justify-between bg-muted px-4 py-3 text-sm font-medium"
          >
            Output
            <HiChevronDown
              className={`h-5 w-5 shrink-0 opacity-60 transition-transform duration-200 ${outputOpen ? "rotate-180" : ""}`}
            />
          </button>
          {outputOpen && (
            <div className="whitespace-pre-wrap bg-background p-4 font-mono text-sm text-foreground">
              {output}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
