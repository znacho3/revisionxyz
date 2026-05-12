import * as React from "react"
import { PiFile } from "react-icons/pi"
import { BiX } from "react-icons/bi"
import { cn } from "@/lib/utils"

interface FileUploadProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  file: File | null
  onFileSelect: (file: File | null) => void
}

const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  ({ className, file, onFileSelect, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const droppedFile = e.dataTransfer.files?.[0]
      if (droppedFile && onFileSelect) {
        onFileSelect(droppedFile)
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile && onFileSelect) {
        onFileSelect(selectedFile)
      }
    }

    if (file) {
      return (
        <section className={cn("rounded-lg", className)}>
          <div className="relative mx-auto flex min-h-[18rem] cursor-pointer flex-col rounded-2xl border-2 transition-colors dark:bg-gray-900 border-muted-foreground border-solid w-full max-w-none bg-muted lg:aspect-[5/2]">
            <div className="flex h-full min-h-[18rem] w-full flex-col justify-between gap-6 p-6">
              <div className="flex flex-1 items-center">
                <div className="flex w-full items-center gap-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
                  <div className="grid h-16 w-16 flex-none place-items-center rounded-2xl bg-muted text-4xl text-muted-foreground">
                    <PiFile className="h-10 w-10" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base text-foreground">{file.name}</p>
                    <p className="mt-1 font-medium text-muted-foreground text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 h-10 w-10 shrink-0 text-2xl text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-foreground/50"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFileSelect(null)
                    }}
                  >
                    <BiX className="h-6 w-6" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-muted-foreground text-sm">Upload a different PDF to replace this file.</p>
                <label
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ring-2 ring-foreground/10 ring-inset w-fit px-4 py-2 text-muted-foreground ring-foreground/10 hover:bg-foreground/10 hover:text-foreground focus-visible:ring-foreground/25 rounded-xl"
                  onClick={() => inputRef.current?.click()}
                >
                  Replace file
                </label>
              </div>
            </div>
            <input
              {...props}
              ref={(node) => {
                inputRef.current = node!
                if (typeof ref === "function") ref(node)
                else if (ref) ref.current = node
              }}
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={handleChange}
            />
          </div>
        </section>
      )
    }

    return (
      <section className={cn("rounded-lg", className)}>
        <div
          className={cn(
            "relative mx-auto flex min-h-[18rem] cursor-pointer flex-col rounded-2xl border-2 transition-colors dark:bg-gray-900 border-border border-dashed w-full max-w-none bg-muted lg:aspect-[5/2]",
            isDragging && "border-accent-primary bg-accent-primary/10"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex min-h-[18rem] flex-col items-center justify-center px-6 py-8 text-center">
            <div className="relative mx-auto h-24 w-0">
              <div className="-left-2 absolute top-0 rotate-12">
                <div className="flex h-20 w-16 flex-col rounded-xl bg-background p-3 shadow-lg ring-2 ring-foreground/10">
                  <div className="flex flex-col gap-1">
                    <div className="h-2 w-full rounded bg-border"></div>
                    <div className="h-2 w-[75%] rounded bg-border"></div>
                    <div className="h-2 w-full rounded bg-border"></div>
                    <div className="h-2 w-[90%] rounded bg-border"></div>
                    <div className="h-2 w-[75%] rounded bg-border"></div>
                  </div>
                </div>
              </div>
              <div className="-rotate-6 -right-2 absolute top-0">
                <div className="flex h-20 w-16 flex-col rounded-xl bg-background p-3 shadow-lg ring-2 ring-foreground/10">
                  <div className="flex flex-col gap-1">
                    <div className="h-8 w-full rounded bg-border"></div>
                    <div className="h-2 w-[90%] rounded bg-border"></div>
                    <div className="mb-1 h-2 w-[55%] rounded bg-border"></div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center font-medium text-accent-primary-foreground text-lg">
              Drag and drop to upload
            </p>
            <p className="text-center text-muted-foreground text-sm">
              Limit 10 MB per file. Supported files: pdf
            </p>
            <label
              className="inline-flex items-center justify-center rounded-lg font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ring-2 ring-foreground/10 ring-inset w-fit px-4 py-2 text-muted-foreground ring-foreground/10 hover:bg-foreground/10 hover:text-foreground focus-visible:ring-foreground/25 mt-4 rounded-xl cursor-pointer"
            >
              Browse files
            </label>
          </div>
          <input
            {...props}
            ref={(node) => {
              // Handle both forwarded ref and local ref
              inputRef.current = node!
              if (typeof ref === "function") ref(node)
              else if (ref) ref.current = node
            }}
            type="file"
            className="hidden"
            accept=".pdf"
            onChange={handleChange}
          />
        </div>
      </section>
    )
  }
)
FileUpload.displayName = "FileUpload"

export { FileUpload }
