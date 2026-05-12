import { Calculation } from './Calculation'
import { Quiz } from './Quiz'
import { Flashcards } from './Flashcards'
import { Graph } from './Graph'
import { CodeBlock } from './CodeBlock'
import {
  HiAcademicCap,
  HiBookOpen,
  HiClipboardList,
  HiCollection,
  HiDocumentText,
  HiGlobeAlt,
  HiPencilAlt,
  HiPhotograph,
  HiPlay,
  HiSearchCircle,
} from 'react-icons/hi'
import { PiMathOperationsFill } from 'react-icons/pi'

export type ToolCall = {
  id: string
  name: string
  input: any
  output?: any
  state: 'calling' | 'completed' | 'failed'
}

export const ToolRenderer = ({ toolCall }: { toolCall: ToolCall }) => {
  if (!toolCall) return null

  switch (toolCall.name) {
    case 'createAssignment': {
      const result = toolCall.output
      const isLoading = toolCall.state === 'calling' || !result
      if (isLoading) {
        return (
          <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
            <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
              <HiPencilAlt className="text-xl" />
            </div>
            <span className="font-medium text-sm">Creating assignment</span>
          </div>
        )
      }
      return (
        <div className="relative my-4 flex cursor-pointer flex-col gap-2 rounded-xl border-2 border-muted bg-muted px-4 py-3">
          <div className="flex items-center gap-2 font-bold text-muted-foreground text-xs">
            <HiClipboardList className="flex-none text-xl" />
            <span>{result?.type}</span>
          </div>
          {result?.title && <h3 className="font-title text-lg leading-6">{result.title}</h3>}
          {result?.description && <p className="text-muted-foreground text-sm">{result.description}</p>}
        </div>
      )
    }

    case 'createLessonPlan': {
      const plan = toolCall.output ?? toolCall.input
      if (!plan) return null
      return (
        <div className="my-4 rounded-xl border border-border bg-muted/60 p-4">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground text-sm">
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth={0}
              viewBox="0 0 20 20"
              aria-hidden
              className="size-4"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v10.5a.5.5 0 01-.79.407L12 12.5l-5.21 2.407A.5.5 0 016 14.5V4z" />
            </svg>
            <span className="font-medium">Lesson plan</span>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(plan, null, 2)}</pre>
        </div>
      )
    }

    case 'readSubject':
    case 'readTopics': {
      const isLoading = toolCall.state === 'calling'
      return (
        <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
          <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
            <HiBookOpen className="text-xl" />
          </div>
          <span className="font-medium text-sm">
            {isLoading ? 'Reading syllabus guide' : 'Read syllabus guide'}
          </span>
        </div>
      )
    }

    case 'calculate': {
      const out = toolCall.output
      const result = typeof out === 'object' && out !== null && 'result' in out ? (out as { result: string | number }).result : out
      return <Calculation expression={toolCall.input?.expression || ''} result={result} />
    }

    case 'generateQuiz':
    case 'generateMCQ': {
      const questions = toolCall.output?.questions ?? toolCall.input?.questions
      if (toolCall.state === 'calling' || !questions) {
        return (
          <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
            <svg className="animate-spin size-6 text-accent-primary-foreground" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" fillRule="evenodd" opacity={0.2} />
              <path d="M2 12C2 6.47715 6.47715 2 12 2V5C8.13401 5 5 8.13401 5 12H2Z" fill="currentColor" />
            </svg>
            <span className="animate-shimmer font-medium text-sm">Generating quiz questions...</span>
          </div>
        )
      }
      return <Quiz questions={questions} />
    }

    case 'generateFlashcards': {
      const flashcards = toolCall.output?.flashcards ?? toolCall.input?.flashcards
      if (toolCall.state === 'calling' || !flashcards) {
        return (
          <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
            <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
              <HiCollection className="text-xl" />
            </div>
            <span className="font-medium text-sm animate-shimmer">Generating flashcards</span>
          </div>
        )
      }
      return <Flashcards flashcards={flashcards} />
    }

    case 'getWebsiteContents': {
      const meta = toolCall.output?.metadata ?? {}
      const title: string = meta['og:title'] || 'Webpage'
      const url: string | undefined = meta['og:url'] || toolCall.output?.url
      const isLoading = toolCall.state === 'calling' || !toolCall.output
      if (isLoading) {
        return (
          <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
            <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
              <HiGlobeAlt className="text-xl" />
            </div>
            <span className="font-medium text-sm">Reading webpage</span>
          </div>
        )
      }
      return (
        <div className="my-4 flex items-center justify-center text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
              <HiGlobeAlt className="text-xl" />
            </div>
            <div className="space-y-0.5">
              <p className="truncate-1 font-medium text-sm">Read: {title}</p>
              {url && (
                <p className="truncate-1 text-xs underline decoration-2 decoration-muted-foreground/50">
                  {url}
                </p>
              )}
            </div>
          </div>
        </div>
      )
    }

    case 'searchNotes': {
      const results = Array.isArray(toolCall.output) ? toolCall.output : Array.isArray(toolCall.output?.results) ? toolCall.output.results : []
      const isLoading = toolCall.state === 'calling' && results.length === 0
      if (isLoading) {
        return (
          <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
            <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
              <HiDocumentText className="text-xl" />
            </div>
            <span className="font-medium text-sm">Searching notes</span>
          </div>
        )
      }
      return (
        <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
          <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
            <HiDocumentText className="text-xl" />
          </div>
          <span className="font-medium text-sm">Found {results.length} notes</span>
        </div>
      )
    }

    case 'showLessons': {
      const results = Array.isArray(toolCall.output) ? toolCall.output : Array.isArray(toolCall.output?.results) ? toolCall.output.results : []
      const isLoading = toolCall.state === 'calling' && results.length === 0
      if (isLoading) {
        return (
          <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
            <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
              <HiAcademicCap className="text-xl" />
            </div>
            <span className="font-medium text-sm">Finding lessons</span>
          </div>
        )
      }
      return (
        <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
          <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
            <HiAcademicCap className="text-xl" />
          </div>
          <span className="font-medium text-sm">Found {results.length} lessons</span>
        </div>
      )
    }

    case 'showVideos': {
      const results = Array.isArray(toolCall.output) ? toolCall.output : Array.isArray(toolCall.output?.results) ? toolCall.output.results : []
      const isLoading = toolCall.state === 'calling' && results.length === 0
      if (isLoading) {
        return (
          <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
            <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
              <HiPlay className="text-xl" />
            </div>
            <span className="font-medium text-sm">Finding videos</span>
          </div>
        )
      }
      return (
        <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
          <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
            <HiPlay className="text-xl" />
          </div>
          <span className="font-medium text-sm">Found {results.length} videos</span>
        </div>
      )
    }

    case 'showFlashcards': {
      const results = Array.isArray(toolCall.output) ? toolCall.output : Array.isArray(toolCall.output?.results) ? toolCall.output.results : []
      const isLoading = toolCall.state === 'calling' && results.length === 0
      if (isLoading) {
        return (
          <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
            <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
              <HiCollection className="text-xl" />
            </div>
            <span className="font-medium text-sm">Finding flashcards</span>
          </div>
        )
      }
      return (
        <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
          <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
            <HiCollection className="text-xl" />
          </div>
          <span className="font-medium text-sm">Found {results.length} flashcard decks</span>
        </div>
      )
    }

    case 'openDataBooklet': {
      const output = toolCall.output
      const isLoading = toolCall.state === 'calling' || !output
      if (isLoading) {
        return (
          <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
            <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
              <PiMathOperationsFill className="text-xl" />
            </div>
            <span className="font-medium text-sm">Reading data booklet</span>
          </div>
        )
      }
      if (output?.error) {
        return (
          <div className="my-4 w-full max-w-md rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Data Booklet Not Available
          </div>
        )
      }
      const subjectName = output?.subjectName ?? 'Subject'
      const url = output?.url as string | undefined
      return (
        <div className="my-4 w-full max-w-sm rounded-2xl border-2 border-border bg-muted/40 p-4">
          <h3 className="font-title text-lg">
            {subjectName} Data Booklet
          </h3>
          <p className="mt-1 text-muted-foreground text-sm">
            Contains constants, formulas and reference data for {subjectName}.
          </p>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background"
            >
              <span>Open data booklet</span>
            </a>
          )}
        </div>
      )
    }

    case 'websearch': {
      const citations =
        Array.isArray(toolCall.output?.citations) && toolCall.output.citations.length > 0
          ? toolCall.output.citations
          : []
      const isLoading = toolCall.state === 'calling' || !toolCall.output
      if (isLoading) {
        return (
          <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
            <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-full border-2 border-border text-xl">
              <HiSearchCircle />
            </div>
            <span className="font-medium text-sm">Searching the web</span>
          </div>
        )
      }
      return (
        <div className="my-4 w-full">
          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
            <div className="flex size-8 items-center justify-center rounded-full border-2 border-border text-xl">
              <HiSearchCircle />
            </div>
            <span className="font-medium text-sm">Search complete</span>
          </div>
          {citations.length > 0 && (
            <div className="mt-2">
              <p className="text-muted-foreground text-sm">
                Found results from {citations.length} sources:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {citations.map((href: string) => {
                  let label = href
                  try {
                    const hostParts = new URL(href).hostname.split('.')
                    const len = hostParts.length
                    label = (len > 2 ? hostParts.slice(len - 3) : hostParts.slice(len - 2)).join('.')
                  } catch {
                    // keep href
                  }
                  return (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-xs font-medium"
                    >
                      <span className="truncate max-w-[140px]">{label}</span>
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )
    }

    case 'getClassroomStudents': {
      const isLoading = toolCall.state === 'calling' || !toolCall.output
      return (
        <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
          <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
            <HiClipboardList className="text-xl" />
          </div>
          <span className="font-medium text-sm">
            {isLoading ? 'Fetching student list' : 'Loaded student data'}
          </span>
        </div>
      )
    }

    case 'getClassroomAssignments': {
      const isLoading = toolCall.state === 'calling' || !toolCall.output
      return (
        <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
          <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
            <HiClipboardList className="text-xl" />
          </div>
          <span className="font-medium text-sm">
            {isLoading ? 'Fetching classroom assignments' : 'Loaded assignment data'}
          </span>
        </div>
      )
    }

    case 'getStudentPerformance': {
      const isLoading = toolCall.state === 'calling' || !toolCall.output
      return (
        <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
          <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
            <HiAcademicCap className="text-xl" />
          </div>
          <span className="font-medium text-sm">
            {isLoading ? 'Analysing student performance' : 'Loaded performance data'}
          </span>
        </div>
      )
    }

    case 'getAssignmentDetail': {
      const isLoading = toolCall.state === 'calling' || !toolCall.output
      return (
        <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
          <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
            <HiClipboardList className="text-xl" />
          </div>
          <span className="font-medium text-sm">
            {isLoading ? 'Fetching assignment details' : 'Loaded assignment details'}
          </span>
        </div>
      )
    }

    case 'generateImage': {
      const isLoading = toolCall.state === 'calling' || !toolCall.output
      if (isLoading) {
        return (
          <div className="my-4 flex items-center justify-center gap-3 text-muted-foreground">
            <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-xl text-xl ring-2 ring-border">
              <HiPhotograph className="text-xl" />
            </div>
            <span className="font-medium text-sm">Generating image</span>
          </div>
        )
      }
      const url = typeof toolCall.output === 'string' ? toolCall.output : (toolCall.output?.url as string | undefined)
      if (!url) return null
      const prompt = toolCall.input?.prompt || 'Generated image'
      return (
        <div className="my-4 flex justify-center">
          <img
            src={url}
            alt={prompt}
            className="max-h-64 max-w-full rounded-xl border border-border object-contain"
          />
        </div>
      )
    }

    case 'showQuickReplies': {
      const options: string[] = toolCall.input?.options ?? toolCall.output?.options ?? []
      if (!options.length) return null
      return (
        <div className="my-2 flex flex-wrap gap-2">
          {options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground"
              disabled
            >
              {opt}
            </button>
          ))}
        </div>
      )
    }

    case 'displayGraph':
    case 'createDiagram':
      const expressions = toolCall.input?.expressions ?? []
      const viewport = toolCall.input?.viewport
      return <Graph expressions={expressions} viewport={viewport} />

    case 'executeCode':
       const input = toolCall.input || {}
       const codeKey = Object.keys(input).find(k => k.endsWith('Code'))
       const lang = input.language || (codeKey ? codeKey.replace('Code', '') : 'javascript')
       const code = input.code || (codeKey ? input[codeKey] : '') || ''
       const output = toolCall.output?.output || ''
       return <CodeBlock language={lang} code={code} output={output} />
       
    default:
      return (
        <div className="rounded-lg border border-border bg-muted p-4">
          <p className="font-semibold">Unknown tool: {toolCall.name}</p>
          <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(toolCall, null, 2)}</pre>
        </div>
      )
  }
}
