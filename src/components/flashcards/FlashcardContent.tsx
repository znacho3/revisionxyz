import { useEffect, useRef, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/** renders latex into span via KaTeX API */
function KatexBlock({ math, displayMode }: { math: string; displayMode: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    katex.render(math, ref.current, { displayMode, throwOnError: false });
  }, [math, displayMode]);
  return <span ref={ref} />;
}

/** parses plain text segment into nodes: **bold**, *italic*, newlines */
function parseInlineToNodes(text: string, keyPrefix: string): ReactNode[] {
  if (!text) return [];
  const result: ReactNode[] = [];
  let keyIdx = 0;
  const key = () => `${keyPrefix}-${keyIdx++}`;

  const lines = text.split("\n");
  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) result.push(<br key={key()} />);
    let i = 0;
    while (i < line.length) {
      const nextBold = line.indexOf("**", i);
      const nextItalic = line.indexOf("*", i);
      let next = -1;
      let kind: "bold" | "italic" | null = null;
      if (nextBold !== -1 && (nextItalic === -1 || nextBold <= nextItalic)) {
        next = nextBold;
        kind = "bold";
      } else if (nextItalic !== -1) {
        next = nextItalic;
        kind = "italic";
      }
      if (next === -1) {
        result.push(line.slice(i));
        break;
      }
      if (next > i) result.push(line.slice(i, next));
      if (kind === "bold") {
        const end = line.indexOf("**", next + 2);
        if (end === -1) {
          result.push(line.slice(next));
          break;
        }
        result.push(<strong key={key()}>{line.slice(next + 2, end)}</strong>);
        i = end + 2;
      } else {
        const end = line.indexOf("*", next + 1);
        if (end === -1) {
          result.push(line.slice(next));
          break;
        }
        result.push(<em key={key()}>{line.slice(next + 1, end)}</em>);
        i = end + 1;
      }
    }
  });
  return result;
}

export type FlashcardSegment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; displayMode: boolean };

/** splits flashcard text into text and math segments */
export function getFlashcardSegments(text: string): FlashcardSegment[] {
  if (!text) return [];
  const segments: FlashcardSegment[] = [];
  let i = 0;

  while (i < text.length) {
    const inlineIdx = text.indexOf("$", i);
    const displayIdx = text.indexOf("$$", i);

    let nextIdx = -1;
    let isDisplay = false;

    if (displayIdx !== -1 && (inlineIdx === -1 || displayIdx <= inlineIdx)) {
      nextIdx = displayIdx;
      isDisplay = true;
    } else if (inlineIdx !== -1) {
      nextIdx = inlineIdx;
    }

    if (nextIdx === -1) {
      segments.push({ type: "text", value: text.slice(i) });
      break;
    }

    if (nextIdx > i) segments.push({ type: "text", value: text.slice(i, nextIdx) });

    if (isDisplay) {
      const end = text.indexOf("$$", nextIdx + 2);
      if (end === -1) {
        segments.push({ type: "text", value: text.slice(nextIdx) });
        break;
      }
      segments.push({ type: "math", value: text.slice(nextIdx + 2, end), displayMode: true });
      i = end + 2;
    } else {
      const end = text.indexOf("$", nextIdx + 1);
      if (end === -1) {
        segments.push({ type: "text", value: text.slice(nextIdx) });
        break;
      }
      segments.push({ type: "math", value: text.slice(nextIdx + 1, end), displayMode: false });
      i = end + 1;
    }
  }

  return segments;
}

type Props = {
  text: string;
  className?: string;
  segmentKeyPrefix?: string;
};

/** renders flashcard text as nodes */
export default function FlashcardContent({ text, className, segmentKeyPrefix = "fc" }: Props) {
  const segments = getFlashcardSegments(text);
  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return (
            <span key={`${segmentKeyPrefix}-${i}`}>
              {parseInlineToNodes(seg.value, `${segmentKeyPrefix}-${i}`)}
            </span>
          );
        }
        return <KatexBlock key={`${segmentKeyPrefix}-${i}`} math={seg.value} displayMode={seg.displayMode} />;
      })}
    </span>
  );
}
