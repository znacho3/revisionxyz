import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { HiPlay, HiClipboard } from 'react-icons/hi'

interface CodeBlockProps {
  language?: string
  code: string
  output?: string
}

export const CodeBlock = ({ language, code, output }: CodeBlockProps) => {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-border">
      <div className="flex items-center justify-between bg-background px-4 py-2">
        <span className="font-manrope text-foreground text-sm capitalize">{language ?? 'Code'}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="justify-center rounded-lg font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 w-fit py-1 text-sm hover:bg-foreground/10 focus-visible:ring-foreground/50 flex items-center gap-1 px-2 text-muted-foreground hover:text-foreground"
          >
            <HiPlay className="h-4 w-4" />
            <span className="font-manrope">Run</span>
          </button>
          <button
            type="button"
            className="justify-center rounded-lg font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 w-fit py-1 text-sm hover:bg-foreground/10 focus-visible:ring-foreground/50 flex items-center gap-1 px-2 text-muted-foreground hover:text-foreground"
          >
            <HiClipboard className="h-4 w-4" />
            <span className="font-manrope">Copy</span>
          </button>
        </div>
      </div>
      <div className="bg-background p-2 pt-0">
        <div className="overflow-x-auto rounded-xl text-sm [&>pre]:!m-0 [&>pre]:!rounded-xl [&>pre]:!p-4 [&>pre]:!bg-[#282c34]">
          <SyntaxHighlighter
            language={language || 'javascript'}
            style={atomOneDark}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: '0.75rem', padding: '1rem', background: '#282c34' }}
            codeTagProps={{ style: { background: 'transparent' } }}
            showLineNumbers={false}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
      {output && (
        <div className="border-t border-border bg-muted/50 p-4">
          <div className="font-mono text-sm whitespace-pre-wrap">{output}</div>
        </div>
      )}
    </div>
  )
}
