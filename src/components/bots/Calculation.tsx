import { useState } from 'react'
import 'katex/dist/katex.min.css'
import { PiMathOperationsFill } from 'react-icons/pi'
import { HiChevronDown } from 'react-icons/hi'

interface CalculationProps {
  expression: string
  result?: string | number
}

export const Calculation = ({ expression, result }: CalculationProps) => {
  const [showDetails, setShowDetails] = useState(false)
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
        <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
          <PiMathOperationsFill />
        </div>
        <span className="font-medium text-sm ">
          <div className="flex items-center gap-2">
            <span>Calculation complete</span>
            <button 
                className="inline-flex items-center justify-center rounded-lg font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 h-6 w-6 shrink-0 text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-foreground/50 opacity-60 hover:opacity-100" 
                title="Show details"
                onClick={() => setShowDetails(!showDetails)}
            >
              <HiChevronDown className={`size-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </span>
      </div>
      {showDetails && (
        <div className="w-full rounded-lg bg-muted p-3 text-sm font-mono">
            <div className="mb-1 text-muted-foreground">Expression:</div>
            <div className="mb-2">{expression}</div>
            <div className="mb-1 text-muted-foreground">Result:</div>
            <div className="font-semibold text-foreground">{result}</div>
        </div>
      )}
    </div>
  )
}
