import { useEffect, useRef } from 'react'
import { Streamdown } from 'streamdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import Desmos from 'desmos'
import { TbGraph } from 'react-icons/tb'

interface Expression {
  latex: string
  color: string
}

interface GraphProps {
  expressions: Expression[]
  viewport?: {
    xmin: number
    xmax: number
    ymin: number
    ymax: number
  }
}

export const Graph = ({ expressions, viewport }: GraphProps) => {
  const graphRef = useRef<HTMLDivElement>(null)
  // @ts-ignore
  const calculatorRef = useRef<Desmos.GraphingCalculator | null>(null)

  useEffect(() => {
    if (graphRef.current && !calculatorRef.current) {
      // @ts-ignore
      calculatorRef.current = Desmos.GraphingCalculator(graphRef.current, {
        keypad: false,
        expressions: false,
        settingsMenu: false,
        zoomButtons: true,
        lockViewport: false,
      })
    }

    if (calculatorRef.current) {
      if (viewport) {
        calculatorRef.current.setMathBounds({
          left: viewport.xmin,
          right: viewport.xmax,
          bottom: viewport.ymin,
          top: viewport.ymax
        })
      }

      calculatorRef.current.removeExpressions(calculatorRef.current.getExpressions())

      expressions.forEach((expr, index) => {
        calculatorRef.current?.setExpression({
          id: `graph-${index}`,
          latex: expr.latex,
          color: expr.color === 'BLUE' ? Desmos.Colors.BLUE : Desmos.Colors.RED
        })
      })
    }

    return () => {
      if (calculatorRef.current) {
        calculatorRef.current.destroy()
        calculatorRef.current = null
      }
    }
  }, [expressions, viewport])

  return (
    <div>
      <div className="flex-auto">
        <div className="max-w-[420px]">
          <div className="-m-1 mb-2 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <TbGraph className="text-3xl text-purple-500" />
              <p className="font-bold text-purple-600 text-sm uppercase tracking-wide dark:text-purple-400">Graph</p>
            </div>
          </div>
          <div className="group relative h-[420px] w-full overflow-hidden rounded-2xl border border-black/20 bg-gray-100">
             <div ref={graphRef} style={{ width: '100%', height: '100%' }}></div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {expressions.map((expr, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1.5 text-sm">
                <div className="size-2 rounded-full" style={{ backgroundColor: expr.color === 'BLUE' ? 'rgb(59, 130, 246)' : 'rgb(239, 68, 68)' }}></div>
                <div className="">
                  <Streamdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {`$$${expr.latex}$$`}
                  </Streamdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
