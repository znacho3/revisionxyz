import { useState } from 'react'
import { Streamdown } from 'streamdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface QuizOption {
  content: string
  correct: boolean
}

interface QuizQuestion {
  question: string
  answerChoices: QuizOption[]
}

export const Quiz = ({ questions }: { questions: QuizQuestion[] }) => {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)

  if (!questions || questions.length === 0) return null

  const question = questions[0]
  const options = question.answerChoices

  const handleOptionClick = (index: number) => {
    if (isAnswered) return
    setSelectedOptionIndex(index)
    setIsAnswered(true)
  }

  const getOptionStyle = (index: number) => {
    if (!isAnswered) {
      return "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
    }
    if (index === selectedOptionIndex) {
      return options[index].correct 
        ? "border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600" 
        : "border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-600"
    }
    if (options[index].correct) {
      return "border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600"
    }
    return "border-gray-200 dark:border-gray-700 opacity-50"
  }

  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-violet-100 via-fuchsia-50 to-sky-100 px-4 py-12 ring-2 ring-black/5 ring-inset dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 dark:ring-white/10">
      <div className="z-10 w-full max-w-[400px] rounded-2xl bg-background p-6 shadow-lg">
        <div className="flex min-h-[360px] w-full flex-col rounded-2xl text-foreground/75">
          <div className="p-1 font-medium text-lg leading-snug">
            <Streamdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {question.question}
            </Streamdown>
          </div>
          <div className="mt-auto space-y-3 pt-4">
            {options.map((option, index) => (
              <button 
                key={index}
                className="group block w-full text-left" 
                type="button"
                onClick={() => handleOptionClick(index)}
                disabled={isAnswered}
              >
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <div className="flex items-start gap-3 w-full">
                    <div className={`grid h-10 w-10 flex-none place-items-center rounded-2xl border-2 font-medium font-title text-gray-500 text-lg transition-colors ${getOptionStyle(index)}`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className="flex min-h-10 flex-auto items-center">
                      <Streamdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {option.content}
                      </Streamdown>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <img alt="" className="-top-8 -right-8 pointer-events-none absolute z-0 size-28 scale-[2] opacity-60" src="https://assets.revisiondojo.com/assets/images/features/learn/full-star.svg" style={{ color: 'transparent' }} />
      <img alt="" className="-top-6 -left-6 -rotate-[40deg] pointer-events-none absolute z-0 size-20 scale-[2] opacity-30" src="https://assets.revisiondojo.com/assets/images/features/learn/full-star.svg" style={{ color: 'transparent' }} />
      <img alt="" className="pointer-events-none absolute right-0 bottom-0 left-0 z-0 w-full min-w-[400px] opacity-50" src="https://assets.revisiondojo.com/assets/images/features/learn/bottom.svg" style={{ color: 'transparent', objectFit: 'cover', objectPosition: 'center bottom' }} />
      <img alt="" className="pointer-events-none absolute right-0 bottom-0 left-0 z-1 w-full min-w-[400px] opacity-50" src="https://assets.revisiondojo.com/assets/images/features/learn/bottom-sparkles.svg" style={{ color: 'transparent', objectFit: 'cover', objectPosition: 'center bottom' }} />
    </div>
  )
}
