import React, { useRef, useEffect, useState } from 'react'
import { TbFiles, TbCode } from 'react-icons/tb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const CHAT_API = (import.meta as { env?: { VITE_CHAT_API_URL?: string } }).env?.VITE_CHAT_API_URL || ''

export type ImageAttachment = { url: string; mediaType: string }

/** attachment with local blob url for preview */
type AttachmentWithPreview = ImageAttachment & { previewUrl: string }

interface ChatboxProps {
  input?: string
  setInput: (value: string) => void
  /** if payload provided, includes text and uploaded image urls (use these instead of input state). */
  onSubmit: (e?: React.FormEvent, payload?: { text: string; imageUrls: ImageAttachment[] }) => void
  loading?: boolean
  className?: string
}

const ACCEPT_IMAGES = 'image/png,image/jpeg,image/webp,image/gif'
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB file limit. maybe add a toast if they upload a large file

export const Chatbox = ({ input = '', setInput, onSubmit, loading, className }: ChatboxProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<AttachmentWithPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const safeInput = input ?? ''

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '56px'
      const scrollHeight = textareaRef.current.scrollHeight
      if (scrollHeight > 56) {
        textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`
      }
    }
  }, [safeInput])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const uploadFile = async (file: File): Promise<ImageAttachment> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${CHAT_API}/api/file`, { method: 'POST', body: form })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || `Upload failed: ${res.status}`)
    }
    const data = (await res.json()) as { url?: string }
    if (!data?.url) throw new Error('No URL in response')
    return { url: data.url, mediaType: file.type || 'image/png' }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const next = prev.filter((_, j) => j !== index)
      const att = prev[index]
      if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl)
      return next
    })
  }

  const clearAttachments = () => {
    attachments.forEach((att) => {
      if (att.previewUrl) URL.revokeObjectURL(att.previewUrl)
    })
    setAttachments([])
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = safeInput.trim()
    const hasImages = attachments.length > 0
    if (!text && !hasImages) return
    if (loading || uploading) return

    const imageUrls: ImageAttachment[] = attachments.map(({ url, mediaType }) => ({ url, mediaType }))
    setInput('')
    clearAttachments()
    onSubmit(undefined, { text, imageUrls })
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const withinLimit = imageFiles.filter((f) => f.size <= MAX_IMAGE_SIZE_BYTES)
    const tooLarge = imageFiles.filter((f) => f.size > MAX_IMAGE_SIZE_BYTES)

    if (tooLarge.length) {
      console.error(
        `Some images were too large and were skipped (max ${(MAX_IMAGE_SIZE_BYTES / 1024 / 1024).toFixed(
          1,
        )}MB).`,
      )
    }

    if (!withinLimit.length) {
      e.target.value = ''
      return
    }

    const previewUrls = withinLimit.map((f) => URL.createObjectURL(f))
    setUploading(true)
    try {
      const uploaded = await Promise.all(withinLimit.map(uploadFile))
      const withPreviews: AttachmentWithPreview[] = uploaded.map((u, i) => ({
        ...u,
        previewUrl: previewUrls[i]!,
      }))
      setAttachments((prev) => [...prev, ...withPreviews])
    } catch (err) {
      console.error('Upload failed:', err)
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const attachmentsRef = useRef(attachments)
  attachmentsRef.current = attachments
  useEffect(
    () => () => {
      attachmentsRef.current.forEach((att) => {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl)
      })
    },
    []
  )

  const canSubmit = safeInput.trim() || attachments.length > 0
  const busy = loading || uploading

  return (
    <div className={`relative w-full ${className || ''}`}>
      <div className="relative pt-0.5" role="presentation">
        <form
          className="group flex flex-col overflow-hidden bg-muted peer relative z-10 w-full rounded-2xl border-none ring-2 ring-foreground/5"
          onSubmit={(e) => { e.preventDefault(); handleSubmit(e) }}
        >
          <div className="flex flex-row">
            <textarea
              ref={textareaRef}
              className="flex w-full ring-offset-background placeholder:text-black/30 focus-visible:outline-none focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-white dark:placeholder:text-white/50 min-h-[24px] resize-none overflow-y-auto rounded-xl bg-muted! px-5 py-4 text-base focus-visible:ring-0 max-h-[200px] text-foreground scrollbar-none"
              placeholder="Ask me anything..."
              style={{ height: '56px' }}
              spellCheck={false}
              value={safeInput}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy}
            />
            <div className="p-1.5">
              <button
                className="inline-flex items-center justify-center font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 h-12 w-12 shrink-0 text-2xl rounded-2xl focus-visible:ring-accent-primary-foreground/50 h-11! w-11! bg-foreground text-background"
                type="submit"
                disabled={busy || !canSubmit}
              >
                {busy ? (
                   <div className="size-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256"><path d="M240,127.89a16,16,0,0,1-8.18,14L63.9,237.9A16.15,16.15,0,0,1,56,240a16,16,0,0,1-15-21.33l27-79.95A4,4,0,0,1,71.72,136H144a8,8,0,0,0,8-8.53,8.19,8.19,0,0,0-8.26-7.47h-72a4,4,0,0,1-3.79-2.72l-27-79.94A16,16,0,0,1,63.84,18.07l168,95.89A16,16,0,0,1,240,127.89Z"></path></svg>
                )}
              </button>
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-col gap-2 px-3">
              <div className="mb-1 flex flex-row items-end gap-2 overflow-x-auto">
                {attachments.map((att, i) => (
                  <div key={i} className="relative">
                    <div className="relative flex h-20 min-h-20 min-w-[72px] max-w-[160px] shrink-0 items-center justify-center overflow-hidden rounded-xl cursor-pointer">
                      <img
                        alt=""
                        className="max-h-full max-w-full object-contain transition-opacity"
                        decoding="async"
                        loading="lazy"
                        src={att.previewUrl}
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-foreground/10 ring-inset" />
                    </div>
                    <button
                      type="button"
                      aria-label="Remove"
                      className="inline-flex items-center justify-center rounded-lg font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-full! -top-0 -right-2 absolute z-10 h-6 w-6 bg-muted-foreground p-0 text-background hover:bg-foreground"
                      onClick={() => removeAttachment(i)}
                    >
                      <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 20 20" aria-hidden="true" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-0 flex justify-between px-2 pb-2">
            <div className="flex gap-0">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_IMAGES}
                multiple
                className="hidden"
                onChange={onFileChange}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="inline-flex items-center justify-center font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 h-10 w-10 shrink-0 text-2xl text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-foreground/50 rounded-xl"
                    aria-label="Add file options"
                    type="button"
                    disabled={busy}
                  >
                    <TbFiles className="size-6 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={8} className="z-50 min-w-[8rem] overflow-hidden rounded-2xl bg-popover p-1 text-popover-foreground shadow-lg ring-2 ring-foreground/10">
                  <DropdownMenuItem
                    className="hover:muted relative select-none rounded-xl px-3 py-2 font-medium text-muted-foreground text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 flex cursor-pointer items-center gap-2"
                    onSelect={(e) => { e.preventDefault(); fileInputRef.current?.click() }}
                  >
                    <TbFiles className="size-6 opacity-60" />
                    <span>Upload image</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:muted relative select-none rounded-xl px-3 py-2 font-medium text-muted-foreground text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 flex cursor-pointer items-center gap-2">
                    <TbCode className="size-6 opacity-60" />
                    <span>Add code</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </form>
      </div>
      <div className="-z-10 pointer-events-none absolute inset-6 bg-gradient opacity-0 blur-2xl transition-opacity duration-300 peer-focus-within:opacity-100"></div>
    </div>
  )
}
