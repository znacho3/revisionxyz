import { useState, useCallback, useEffect } from "react";
import { HiChevronLeft, HiChevronRight, HiSwitchHorizontal } from "react-icons/hi";
import FlashcardContent from "@/components/flashcards/FlashcardContent";
import { cn } from "@/lib/utils";

export type FlashcardItem = {
  id: string;
  front: string;
  back: string;
  cardType?: string;
};

type Props = {
  cards: FlashcardItem[];
  title: string;
  className?: string;
};

export default function FlashcardViewer({ cards, className }: Props) {
  const [order, setOrder] = useState<number[]>(() => cards.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setOrder(cards.map((_, i) => i));
    setIndex(0);
    setFlipped(false);
  }, [cards.length]);

  const total = cards.length;
  const card = cards[order[index] ?? 0];
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  const goPrev = useCallback(() => {
    setFlipped(false);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setFlipped(false);
    setIndex((i) => Math.min(total - 1, i + 1));
  }, [total]);

  const shuffleDeck = useCallback(() => {
    setOrder((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    setIndex(0);
    setFlipped(false);
  }, []);

  if (total === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-12 text-center", className)}>
        <p className="text-muted-foreground">No cards in this deck.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative mx-auto flex max-w-4xl flex-col gap-4", className)}>
      <div className="mt-2 flex justify-center gap-2">
        <button
          type="button"
          onClick={shuffleDeck}
          className="inline-flex w-fit flex-none items-center justify-center gap-2 rounded-2xl bg-muted px-5 py-3 text-lg font-medium text-muted-foreground ring-offset-background transition-all hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <HiSwitchHorizontal className="size-6 opacity-60" aria-hidden />
          Shuffle deck
        </button>
      </div>

      <div className="mt-4 mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={!hasPrev}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-medium text-muted-foreground ring-offset-background transition-all hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Previous card"
        >
          <HiChevronLeft className="size-5" aria-hidden />
        </button>
        <div className="mb-[26px] flex-auto">
          <p className="subtitle mb-1 text-center font-medium">
            {index + 1} / {total}
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={total > 0 ? Math.round((100 * (index + 1)) / total) : 0}
            className="relative h-4 w-full overflow-hidden rounded-full bg-secondary"
          >
            <div
              className="h-full w-full flex-1 rounded-full transition-all"
              style={{
                backgroundColor: "rgb(2, 132, 199)",
                transform: `translateX(-${total > 0 ? 100 - (100 * (index + 1)) / total : 100}%)`,
              }}
            >
              <div
                className="absolute top-1 right-2 h-1 rounded-full bg-white/20 transition-all"
                style={{
                  width: `max(${total > 0 ? (100 * (index + 1)) / total : 0}% - 16px, 0px)`,
                }}
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={goNext}
          disabled={!hasNext}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-medium text-muted-foreground ring-offset-background transition-all hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Next card"
        >
          <HiChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      <div className="relative mt-2" draggable={false} tabIndex={0} style={{ userSelect: "none", touchAction: "pan-y" }}>
        <button
          className="flip-card m-0 block h-full w-full touch-manipulation border-0 bg-transparent p-0"
          type="button"
          style={{ outline: "none", userSelect: "none", WebkitTapHighlightColor: "transparent" }}
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "Show question" : "Show answer"}
        >
          <div
            className={cn(
              "flip-card-inner aspect-[4/3] w-full min-w-[224px] transform-gpu cursor-pointer rounded-3xl bg-background shadow-xl ring-2 ring-border transition-all duration-500",
            )}
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <div
              className="flip-card-front absolute inset-0 flex flex-col px-4 sm:px-6 md:px-8"
              style={{ paddingTop: 64, paddingBottom: 80, backfaceVisibility: "hidden" }}
            >
              <div className="w-full overflow-y-auto" style={{ flex: "1 1 auto", scrollBehavior: "smooth" }}>
                <div className="flex min-h-full items-center justify-center py-4">
                  <FlashcardContent
                    text={card.front}
                    className="prose prose-neutral block w-full space-y-3 text-pretty text-lg font-medium leading-6 text-foreground marker:text-inherit dark:prose-invert md:text-xl prose-strong:font-semibold print:overflow-hidden print:text-black"
                    segmentKeyPrefix="front"
                  />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2">
                <span className="text-sm font-medium">Flip</span>
                <div className="rounded-lg border-2 border-border border-b-4 bg-background px-1.5 py-1 font-mono text-xs font-semibold text-muted-foreground">
                  Spacebar
                </div>
              </div>
            </div>
            <div
              className="flip-card-back absolute inset-0 flex flex-col px-4 sm:px-6 md:px-8"
              style={{ paddingTop: 64, paddingBottom: 80, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="w-full overflow-y-auto" style={{ flex: "1 1 auto", scrollBehavior: "smooth" }}>
                <div className="flex min-h-full items-center justify-center py-4">
                  <FlashcardContent
                    text={card.back}
                    className="prose prose-neutral block w-full space-y-3 text-pretty text-lg font-medium leading-6 text-foreground marker:text-inherit dark:prose-invert md:text-xl prose-strong:font-semibold print:overflow-hidden print:text-black"
                    segmentKeyPrefix="back"
                  />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2">
                <span className="text-sm font-medium">Flip</span>
                <div className="rounded-lg border-2 border-border border-b-4 bg-background px-1.5 py-1 font-mono text-xs font-semibold text-muted-foreground">
                  Spacebar
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
