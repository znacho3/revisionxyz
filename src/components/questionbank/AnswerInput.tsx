import { useState, useRef, useEffect } from "react";
import { CentralIcon } from "@central-icons-react/all";
import { TbMicrophoneFilled } from "react-icons/tb";
import { HiLightningBolt } from "react-icons/hi";

const centralIconPropsSolid = {
  join: "round" as const,
  fill: "filled" as const,
  stroke: "2" as const,
  radius: "2" as const,
  size: 24,
  ariaHidden: true as const,
};

export default function AnswerInput({ partId }: { partId: number }) {
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.value.trim()
      ) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  if (!expanded) {
    return (
      <div className="relative print:hidden">
        <div className="group -mx-3 mt-1 flex flex-col justify-center rounded-2xl border-2 border-muted bg-muted p-0 transition-colors hover:border-border hover:bg-border sm:mx-0">
          <div>
            <button
              className="flex min-h-[40px] w-full cursor-text items-center px-4 py-3 text-left text-[15px] text-muted-foreground"
              type="button"
              onClick={() => setExpanded(true)}
            >
              Write your answer here...
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative print:hidden" ref={containerRef}>
      <div className="group -mx-3 mt-1 flex flex-col justify-center rounded-2xl border-2 border-muted bg-muted p-0 sm:mx-0">
        <div>
          <div className="flex max-h-[640px] flex-col overflow-hidden sm:flex-row">
            <div className="group flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="relative flex min-h-0 flex-1 flex-col">
                <div className="relative min-h-0 flex-1">
                  <div className="h-full overflow-x-hidden overflow-y-auto scrollbar-none">
                    <div className="min-h-[40px] w-full min-w-0 px-4 py-2.5">
                      <textarea
                        ref={textareaRef}
                        className="w-full min-w-0 resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                        placeholder="Write your answer here..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 rounded-t-2xl bg-gradient-to-b from-muted to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 rounded-b-2xl bg-gradient-to-t from-muted to-transparent" />
                </div>
                <div className="flex flex-none items-center gap-0 overflow-x-auto p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    className="inline-flex w-fit items-center justify-center gap-2 rounded-xl py-1.5 pl-2 pr-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
                    type="button"
                  >
                    <CentralIcon {...centralIconPropsSolid} name="IconImages1" className="size-6 opacity-60" />
                    <span className="text-sm font-medium">Add</span>
                  </button>
                  <button
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl text-muted-foreground transition-all hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
                    type="button"
                  >
                    <TbMicrophoneFilled className="size-6 opacity-60" aria-hidden />
                    <span className="sr-only">Record audio</span>
                  </button>
                  <button
                    className="inline-flex w-fit items-center justify-center gap-2 rounded-xl py-1.5 pl-2 pr-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
                    type="button"
                  >
                    <CentralIcon {...centralIconPropsSolid} name="IconHighlight" className="size-6 opacity-60" />
                    <span className="text-sm font-medium">Draw</span>
                  </button>
                  <button
                    className="inline-flex w-fit items-center justify-center gap-2 rounded-xl py-1.5 pl-2 pr-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
                    type="button"
                  >
                    <CentralIcon {...centralIconPropsSolid} name="IconMathScientific" className="size-6 opacity-60" />
                    <span className="text-sm font-medium">Math</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none z-10 mt-0 flex flex-wrap justify-between gap-1 px-1.5 pb-1.5">
          <div className="pointer-events-auto flex flex-wrap items-end gap-1 overflow-x-auto">
            <button
              className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground/50"
              id={`question-part-markscheme-${partId}`}
              type="button"
            >
              <CentralIcon {...centralIconPropsSolid} name="IconChecklist" className="size-5 opacity-60" />
              Markscheme
            </button>
            <div className="flex items-center gap-1.5">
              <button
                className="inline-flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium ring-2 ring-inset text-accent-fuchsia-foreground ring-accent-fuchsia-foreground/25 transition-all hover:bg-accent-fuchsia hover:ring-accent-fuchsia-foreground/50 focus-visible:outline-none focus-visible:ring-accent-fuchsia/50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled
                type="button"
              >
                <div className="flex items-center gap-1">
                  <span>Grade answer</span>
                  <div className="-my-1 flex items-center">
                    <HiLightningBolt className="inline-block align-middle text-lg opacity-60" aria-hidden />
                    <span className="ml-0.5 align-middle">1</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
