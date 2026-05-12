import { useState } from 'react'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi'
import { Streamdown } from 'streamdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface Flashcard {
  front: string
  back: string
}

export const Flashcards = ({ flashcards }: { flashcards: Flashcard[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const currentCard = flashcards[currentIndex]
  const total = flashcards.length

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  if (!flashcards || flashcards.length === 0) return null

  return (
    <div className="relative mt-4 flex w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-violet-100 via-fuchsia-50 to-sky-100 px-2 pt-12 pb-12 ring-2 ring-black/5 ring-inset sm:px-4 dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 dark:ring-white/10">
      <img alt="" className="-top-8 -right-8 pointer-events-none absolute z-0 size-28 scale-[2] opacity-60" src="https://assets.revisiondojo.com/assets/images/features/learn/full-star.svg" style={{ color: 'transparent' }} />
      <img alt="" className="-top-6 -left-6 -rotate-[40deg] pointer-events-none absolute z-0 size-20 scale-[2] opacity-30" src="https://assets.revisiondojo.com/assets/images/features/learn/full-star.svg" style={{ color: 'transparent' }} />
      
      <div className="z-10 w-full max-w-[400px] space-y-4">
        <div className="mb-4 flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <svg aria-label={`Card ${currentIndex + 1} of ${total}`} className="-rotate-90 size-6" role="img" viewBox="0 0 32 32">
              <circle className="text-violet-300/50 dark:text-white/30" cx="16" cy="16" fill="none" r="12" stroke="currentColor" strokeWidth="4"></circle>
              <circle className="text-violet-600/75 transition-all duration-300 dark:text-white" cx="16" cy="16" fill="none" r="12" stroke="currentColor" strokeDasharray="75.398" strokeDashoffset={75.398 - (75.398 * (currentIndex + 1) / total)} strokeLinecap="round" strokeWidth="4"></circle>
            </svg>
            <span className="font-medium text-sm text-violet-700/75 dark:text-white">{currentIndex + 1} of {total}</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handlePrev} 
              disabled={currentIndex === 0}
              className="inline-flex items-center justify-center font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 h-8 w-8 shrink-0 text-2xl rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-foreground/50"
            >
              <HiChevronLeft className="size-5" />
            </button>
            <button 
              onClick={handleNext}
              disabled={currentIndex === total - 1}
              className="inline-flex items-center justify-center font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 h-8 w-8 shrink-0 text-2xl rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-foreground/50"
            >
              <HiChevronRight className="size-5" />
            </button>
          </div>
        </div>

        <div className="w-full">
          <button 
            className="relative h-[320px] w-full cursor-pointer [perspective:1000px] focus-visible:outline-none" 
            type="button"
            onClick={handleFlip}
          >
            <div className={`relative h-full w-full [transform-style:preserve-3d] transition-transform duration-500 ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
              <div className="absolute inset-0 flex flex-col rounded-2xl bg-background shadow-lg ring-2 ring-foreground/10 [backface-visibility:hidden]">
                <div className="flex flex-1 items-center justify-center p-6 text-center">
                  <div className="font-medium text-foreground text-lg">
                    <Streamdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {currentCard.front}
                    </Streamdown>
                  </div>
                </div>
                <p className="pb-4 text-center font-medium text-muted-foreground text-xs">Front · Click to flip</p>
              </div>
              <div className="absolute inset-0 flex flex-col rounded-2xl bg-background shadow-lg ring-2 ring-foreground/10 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <div className="flex flex-1 items-center justify-center p-6 text-center">
                  <div className="text-foreground text-lg">
                    <Streamdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {currentCard.back}
                    </Streamdown>
                  </div>
                </div>
                <p className="pb-4 text-center font-medium text-muted-foreground text-xs">Back · Click to flip</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
