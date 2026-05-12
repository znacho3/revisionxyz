import { createFileRoute, useRouterState, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Streamdown,
  defaultRemarkPlugins,
  defaultRehypePlugins,
} from 'streamdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { cn } from '@/lib/utils'
import { saveChat, saveMessages, getMessages, getChats } from '@/lib/chatStorage'
import { findValidAccount, createAccount, decrementChatsLeft } from '@/lib/accountManager'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/modal'
import { ChatSidebar } from '@/components/bots/Sidebar'
import { Tip, Note, Example, CommonMistake } from '@/components/bots/Callouts'
import { CodeBlock } from '@/components/bots/CodeBlock'
import { Chatbox, type ImageAttachment } from '@/components/bots/Chatbox'
import { ToolRenderer, type ToolCall } from '@/components/bots/ToolRenderer'
import { HiReply, HiArrowCircleDown, HiChevronDown, HiQuestionMarkCircle, HiLightBulb, HiPencil } from 'react-icons/hi'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type AssistantPart =
  | { type: 'text'; text: string }
  | { type: 'tool'; toolCall: ToolCall }

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  experimental_attachments?: { name?: string; contentType?: string; url: string }[]
  toolCalls?: ToolCall[]
  parts?: AssistantPart[]
}

// same-origin when using Vite proxy (default)
const CHAT_API = (import.meta as { env?: { VITE_CHAT_API_URL?: string } }).env?.VITE_CHAT_API_URL || ''

const JOJO_GRADIENT_ICON = 'https://pub-images.revisiondojo.com/jojo-icon/jojo.jpg'

type JojoBot = {
  id: string
  name: string
  description: string
  iconUrl: string
}

const DEFAULT_JOJO_AI: JojoBot = {
  id: 'jojo-ai',
  name: 'Jojo AI',
  description: 'Your AI study assistant',
  iconUrl: JOJO_GRADIENT_ICON,
}

function parseR2StorageUrl(storageUrl: string): { key: string; bucket: string } | null {
  try {
    const u = new URL(storageUrl)
    const path = u.pathname
    const match = /^\/chat-files\/?(.*)$/.exec(path)
    if (!match) return null
    const key = match[1]?.replace(/^\/+/, '') || ''
    if (!key) return null
    return { key, bucket: 'chat-files' }
  } catch {
    return null
  }
}

/** renders chat image. fetches presigned url when the stored url is on r2 */
function ChatImage({ storageUrl, className }: { storageUrl: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const r2 = parseR2StorageUrl(storageUrl)
    if (!r2) {
      setSrc(storageUrl)
      return
    }
    const q = new URLSearchParams({ key: r2.key, bucket: r2.bucket })
    fetch(`${CHAT_API}/api/presigned-url?${q}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data: { url?: string }) => {
        if (data?.url) setSrc(data.url)
        else setFailed(true)
      })
      .catch(() => setFailed(true))
  }, [storageUrl])

  if (failed) return <span className={className}>Unable to load image</span>
  if (!src) return <div className={cn(className, 'animate-pulse bg-muted rounded-lg min-h-[120px]')} />
  return <img src={src} alt="" className={className} decoding="async" loading="lazy" />
}

type SearchParams = {
  q?: string
}

export const Route = createFileRoute('/chat/$botId/$chatId')({
  component: ChatPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      q: (search.q as string) || '',
    }
  },
})

/** streamdown components aligned with revisiondojo: callouts (tip, note, example, etc.), code, and p as div for nesting */
const markdownComponents = {
  tip: Tip,
  note: Note,
  example: Example,
  commonmistake: CommonMistake,
  hint: Tip,
  table: (props: any) => (
    <div className="my-4 w-full overflow-x-auto">
      <table
        className={cn(
          'w-full border-collapse text-sm',
          '[&_th]:border [&_th]:border-border [&_th]:bg-muted/60 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium',
          '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2',
          props.className,
        )}
      >
        {props.children}
      </table>
    </div>
  ),
  thead: (props: any) => <thead {...props} />,
  tbody: (props: any) => <tbody {...props} />,
  tr: (props: any) => <tr {...props} />,
  th: (props: any) => <th {...props} />,
  td: (props: any) => <td {...props} />,
  code: (props: any) => {
    const { inline, className, children } = props
    const match = /language-(\w+)/.exec(className || '')
    if (!inline && match) {
      return <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
    }
    return <code className={cn('rounded bg-muted px-1.5 py-0.5 font-mono text-foreground text-sm', className)} {...props}>{children}</code>
  },
  p: (props: any) => <div {...props} className={cn('mb-4', props.className)} />,
}

/** streamdown props: use default plugins (GFM for tables, etc.) + math; custom components for callouts and code */
const STREAMDOWN_CLASS = 'space-y-4 whitespace-normal *:first:mt-0 *:last:mb-0'
const streamdownBaseProps = {
  remarkPlugins: [...Object.values(defaultRemarkPlugins), remarkMath],
  rehypePlugins: [...Object.values(defaultRehypePlugins), rehypeKatex],
  components: markdownComponents,
  parseIncompleteMarkdown: true,
  normalizeHtmlIndentation: true,
  className: STREAMDOWN_CLASS,
  linkSafety: { enabled: true } as const,
  controls: true,
}

const EMPTY_CHAT_QUESTIONS = [
  {
    id: 'kinematics',
    prefix: 'Quiz me',
    suffix: 'on kinematics: SUVAT equations and projectile motion',
    iconBg: 'bg-sky-100 dark:bg-sky-900/50',
    iconColor: 'text-sky-600 dark:text-sky-400',
    icon: HiQuestionMarkCircle,
  },
  {
    id: 'paper1',
    prefix: 'Explain',
    suffix: 'on structuring a Paper 1 analysis of an unseen non-literary text',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    icon: HiLightBulb,
  },
  {
    id: 'functions',
    prefix: 'Practice',
    suffix: 'on function transformations (shifts, stretches, reflections) and domain/range',
    iconBg: 'bg-purple-100 dark:bg-purple-900/50',
    iconColor: 'text-purple-600 dark:text-purple-400',
    icon: HiPencil,
  },
] as const

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

type ChatRouteState = {
  imageUrls?: ImageAttachment[]
  initialChat?: {
    text?: string
    imageUrls?: ImageAttachment[]
  }
}

function ChatPage() {
  const { chatId: chatIdParam, botId } = Route.useParams()
  const { q } = Route.useSearch()
  const location = useRouterState({ select: (s) => s.location }) as { state?: ChatRouteState }
  const initialText = location?.state?.initialChat?.text ?? q ?? ''
  const initialImageUrls = location?.state?.initialChat?.imageUrls ?? location?.state?.imageUrls
  const navigate = useNavigate()

  // activeChatId is null for unsaved /new chat or a uuid once created
  const [activeChatId, setActiveChatId] = useState<string | null>(() =>
    chatIdParam === 'new' ? null : chatIdParam,
  )
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    chatIdParam === 'new' ? [] : (getMessages(chatIdParam) as ChatMessage[]),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [input, setInput] = useState('')
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [botName, setBotName] = useState('Jojo AI')
  const [botIconUrl, setBotIconUrl] = useState<string | null>(JOJO_GRADIENT_ICON)
  const [bots, setBots] = useState<JojoBot[]>([])
  const [jojoDropdownOpen, setJojoDropdownOpen] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [creationStatus, setCreationStatus] = useState('')

  const [accountTag, setAccountTag] = useState<string | null>(() => {
    if (chatIdParam === 'new') return null
    const chats = getChats()
    return chats.find((c) => c.id === chatIdParam)?.accountTag ?? null
  })

  // keep latest values accessible inside async closures without stale
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const activeChatIdRef = useRef(activeChatId)
  activeChatIdRef.current = activeChatId
  const accountTagRef = useRef(accountTag)
  accountTagRef.current = accountTag
  const abortRef = useRef<AbortController | null>(null)
  const initialized = useRef(false)

  // sync internal state when route params change
  useEffect(() => {
    if (chatIdParam === 'new') {
      if (activeChatIdRef.current === null) return
      abortRef.current?.abort()
      const oldId = activeChatIdRef.current
      if (oldId && messagesRef.current.length > 0) saveMessages(oldId, messagesRef.current)
      setActiveChatId(null)
      setMessages([])
      setFollowUpQuestions([])
      setError(null)
      setInput('')
      setIsLoading(false)
      setAccountTag(null)
      initialized.current = false
      messagesRef.current = []
      activeChatIdRef.current = null
      accountTagRef.current = null
    } else if (chatIdParam !== activeChatIdRef.current) {
      abortRef.current?.abort()
      const oldId = activeChatIdRef.current
      if (oldId && messagesRef.current.length > 0) saveMessages(oldId, messagesRef.current)
      const loaded = getMessages(chatIdParam) as ChatMessage[]
      const chatTag = getChats().find((c) => c.id === chatIdParam)?.accountTag ?? null
      setActiveChatId(chatIdParam)
      setMessages(loaded)
      setFollowUpQuestions([])
      setError(null)
      setIsLoading(false)
      setAccountTag(chatTag)
      initialized.current = false
      messagesRef.current = loaded
      activeChatIdRef.current = chatIdParam
      accountTagRef.current = chatTag
    }
  }, [chatIdParam, botId])

  // abort stream + flush save on unmount
  useEffect(() => () => {
    abortRef.current?.abort()
    const id = activeChatIdRef.current
    const msgs = messagesRef.current
    if (id && msgs.length > 0) saveMessages(id, msgs)
  }, [])

  // persist messages to localStorage during streaming (crash resilience).
  // DOES NOT call saveChat
  useEffect(() => {
    if (!activeChatId || messages.length === 0) return
    const timer = setTimeout(() => saveMessages(activeChatId, messages), 500)
    return () => clearTimeout(timer)
  }, [messages, activeChatId])

  useEffect(() => {
    if (botId === 'jojo-ai') {
      setBotName('Jojo AI')
      setBotIconUrl(JOJO_GRADIENT_ICON)
    }
    let cancelled = false
    fetch('/bots.json')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const json = data?.result?.data?.json ?? {}
        const allBots: JojoBot[] = Object.entries(json).map(([key, value]) => {
          const bot = value as Record<string, unknown>
          return {
            id: (bot.id as string) ?? key,
            name: (bot.name as string) ?? key,
            description: (bot.description as string) ?? '',
            iconUrl: (bot.iconUrl as string) ?? '',
          }
        })
        setBots(allBots)
        const found = allBots.find((b) => b.id === botId)
        if (found) {
          if (found.name) setBotName(found.name)
          if (found.iconUrl) setBotIconUrl(found.iconUrl)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [botId])

  const ensureChatId = useCallback((): string => {
    if (activeChatIdRef.current) return activeChatIdRef.current
    const newId = crypto.randomUUID()
    activeChatIdRef.current = newId
    setActiveChatId(newId)
    navigate({ to: '/chat/$botId/$chatId', params: { botId, chatId: newId }, replace: true })
    return newId
  }, [botId, navigate])

  const toApiMessages = useCallback((msgs: ChatMessage[]) => {
    return msgs.map((m) => ({ role: m.role, content: m.content }))
  }, [])

  const fetchFollowUpQuestions = useCallback(async (msgs: ChatMessage[], session?: string) => {
    if (msgs.length < 2) return
    const contextMessages = msgs.slice(-4)
    try {
      const res = await fetch(`${CHAT_API}/api/followup-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: contextMessages, session }),
      })
      if (!res.ok) return
      const data = await res.json()
      const questions = Array.isArray(data) ? data : Array.isArray(data?.questions) ? data.questions : []
      setFollowUpQuestions(questions.slice(0, 3))
    } catch (e) {
      console.error('Failed to fetch follow-ups', e)
    }
  }, [])

  const append = useCallback(
    async (msg: { role: 'user'; content: string; experimental_attachments?: { url: string; name?: string; contentType?: string }[] }) => {
      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: msg.content,
        experimental_attachments: msg.experimental_attachments,
      }
      const allMessages = [...messagesRef.current, userMsg]
      messagesRef.current = allMessages
      setMessages(allMessages)

      setError(null)
      setIsLoading(true)
      setFollowUpQuestions([])

      let account = findValidAccount(accountTagRef.current ?? undefined)

      if (!account) {
        setCreationStatus('Starting...')
        setIsCreatingAccount(true)
        try {
          account = await createAccount((msg) => setCreationStatus(msg))
        } catch (err) {
          setIsCreatingAccount(false)
          setCreationStatus('')
          setError(new Error('Error: ' + (err instanceof Error ? err.message : String(err))))
          setIsLoading(false)
          return
        }
        setIsCreatingAccount(false)
        setCreationStatus('')
      }

      // defer ensureChatId until after async account resolution so navigate() doesnt race with route-sync and abort the controller
      const chatId = ensureChatId()

      const controller = new AbortController()
      abortRef.current = controller

      const isNewChat = messagesRef.current.length === 1
      if (accountTagRef.current !== account.tag) {
        accountTagRef.current = account.tag
        setAccountTag(account.tag)
      }
      if (isNewChat) {
        decrementChatsLeft(account.tag)
      }

      saveMessages(chatId, allMessages)
      saveChat({ id: chatId, botId, accountTag: account.tag })

      const assistantId = generateId()
      const assistantParts: AssistantPart[] = []
      let currentTextBuffer = ''
      const flushText = () => {
        if (currentTextBuffer) {
          assistantParts.push({ type: 'text', text: currentTextBuffer })
          currentTextBuffer = ''
        }
      }
      const getDisplayParts = (): AssistantPart[] => [
        ...assistantParts,
        ...(currentTextBuffer ? [{ type: 'text' as const, text: currentTextBuffer }] : []),
      ]
      const getContentFromParts = () => getDisplayParts().map((p) => (p.type === 'text' ? p.text : '')).join('')
      const buildAssistantMessage = (): ChatMessage => ({
        id: assistantId,
        role: 'assistant',
        content: getContentFromParts(),
        parts: getDisplayParts(),
      })

      const apiBotId = botId === 'jojo-ai' ? null : botId
      const body = { botId: apiBotId, messages: toApiMessages(allMessages), session: account.sesh }

      try {
        const res = await fetch(`${CHAT_API}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        if (!res.ok) {
          const t = await res.text()
          throw new Error(t || `Chat failed: ${res.status}`)
        }
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const chunks = buffer.split(/\n\n+/)
          buffer = chunks.pop() ?? ''
          for (const block of chunks) {
            let dataLine: string | null = null
            for (const line of block.split('\n')) {
              if (line.startsWith('data: ')) {
                dataLine = line.slice(6)
                break
              }
            }
            if (dataLine == null) continue
            try {
              const event = JSON.parse(dataLine) as {
                type?: string
                delta?: string
                message?: string
                toolCallId?: string
                toolName?: string
                input?: unknown
                output?: unknown
              }
              if (event.type === 'error') {
                setError(new Error(event.message ?? 'We just had an error. Try again.'))
                return
              }
              if (event.type === 'text-delta' && typeof event.delta === 'string') {
                currentTextBuffer += event.delta
                setMessages((prev) => {
                  const rest = prev.filter((m) => m.id !== assistantId)
                  return [...rest, buildAssistantMessage()]
                })
                continue
              }
              if (event.type === 'tool-input-start' && event.toolCallId && event.toolName) {
                flushText()
                assistantParts.push({
                  type: 'tool',
                  toolCall: { id: event.toolCallId, name: event.toolName, input: {}, state: 'calling' },
                })
                setMessages((prev) => {
                  const rest = prev.filter((m) => m.id !== assistantId)
                  return [...rest, buildAssistantMessage()]
                })
              }
              if (event.type === 'tool-input-available' && event.toolCallId) {
                const part = assistantParts.find((p) => p.type === 'tool' && p.toolCall.id === event.toolCallId) as { type: 'tool'; toolCall: ToolCall } | undefined
                if (part) {
                  part.toolCall.input = event.input ?? part.toolCall.input
                  part.toolCall.name = event.toolName ?? part.toolCall.name
                } else {
                  flushText()
                  assistantParts.push({
                    type: 'tool',
                    toolCall: {
                      id: event.toolCallId,
                      name: event.toolName ?? 'unknown',
                      input: event.input ?? {},
                      state: 'calling',
                    },
                  })
                }
                setMessages((prev) => {
                  const rest = prev.filter((m) => m.id !== assistantId)
                  return [...rest, buildAssistantMessage()]
                })
              }
              if (event.type === 'tool-output-available' && event.toolCallId) {
                const part = assistantParts.find((p) => p.type === 'tool' && p.toolCall.id === event.toolCallId) as { type: 'tool'; toolCall: ToolCall } | undefined
                if (part) {
                  part.toolCall.output = event.output
                  part.toolCall.state = 'completed'
                } else {
                  flushText()
                  assistantParts.push({
                    type: 'tool',
                    toolCall: {
                      id: event.toolCallId,
                      name: (event as { toolName?: string }).toolName ?? 'unknown',
                      input: {},
                      output: event.output,
                      state: 'completed',
                    },
                  })
                }
                setMessages((prev) => {
                  const rest = prev.filter((m) => m.id !== assistantId)
                  return [...rest, buildAssistantMessage()]
                })
              }
              if (event.type === 'tool-output-error' && event.toolCallId) {
                const part = assistantParts.find((p) => p.type === 'tool' && p.toolCall.id === event.toolCallId) as { type: 'tool'; toolCall: ToolCall } | undefined
                if (part) part.toolCall.state = 'failed'
                setMessages((prev) => {
                  const rest = prev.filter((m) => m.id !== assistantId)
                  return [...rest, buildAssistantMessage()]
                })
              }
            } catch (_) {
              // skip non-JSON or malformed data
            }
          }
        }
        flushText()
        const finalMessages: ChatMessage[] = [...allMessages, buildAssistantMessage()]
        messagesRef.current = finalMessages
        setMessages(finalMessages)
        saveMessages(chatId, finalMessages)
        saveChat({ id: chatId, botId, accountTag: account.tag, updatedAt: Date.now() })

        if (finalMessages.length === 2) {
          fetch(`${CHAT_API}/api/chat/update-title`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId,
              botId: apiBotId,
              session: account.sesh,
              messages: finalMessages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                parts: m.parts?.map((p) => (p.type === 'text' ? { type: 'text' as const, text: p.text } : null)).filter(Boolean) ?? [{ type: 'text', text: m.content }],
              })),
            }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((data: { title?: string } | null) => {
              const title = data?.title
              const fallback = (finalMessages[0]?.content ?? '').trim().slice(0, 40) || undefined
              saveChat({ id: chatId, botId, accountTag: account.tag, title: title ?? fallback })
            })
            .catch(() => {
              const fallback = (finalMessages[0]?.content ?? '').trim().slice(0, 40) || undefined
              saveChat({ id: chatId, botId, accountTag: account.tag, title: fallback })
            })
        }

        fetchFollowUpQuestions(finalMessages, account.sesh)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    },
    [botId, ensureChatId, toApiMessages, fetchFollowUpQuestions],
  )

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const threshold = 80
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setIsAtBottom(distanceFromBottom <= threshold)
  }, [])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    handleScroll()
    el.addEventListener('scroll', handleScroll)
    return () => { el.removeEventListener('scroll', handleScroll) }
  }, [handleScroll])

  useEffect(() => {
    if (!isAtBottom) return
    scrollToBottom('auto')
  }, [messages.length, isLoading, isAtBottom, scrollToBottom])

  const appendRef = useRef(append)
  appendRef.current = append

  useEffect(() => {
    if (initialized.current) return
    if (!initialText && !initialImageUrls?.length) return
    if (messagesRef.current.length > 0) {
      initialized.current = true
      return
    }
    initialized.current = true
    const attachments = initialImageUrls?.map((img) => ({ name: 'Image', contentType: img.mediaType, url: img.url }))
    appendRef.current({ role: 'user', content: initialText, experimental_attachments: attachments })
  }, [chatIdParam, initialText, initialImageUrls])

  const handleCustomSubmit = (e?: React.FormEvent, payload?: { text: string; imageUrls: ImageAttachment[] }) => {
    e?.preventDefault()
    const text = payload?.text ?? input
    const imageUrls = payload?.imageUrls ?? []
    if (!text && imageUrls.length === 0) return
    setFollowUpQuestions([])
    const attachments = imageUrls.map((img) => ({ name: 'Image', contentType: img.mediaType, url: img.url }))
    append({ role: 'user', content: text, experimental_attachments: attachments })
    setInput('')
  }

  const showEmptyState = messages.length === 0 && !isLoading && !error
  const allJojos = [DEFAULT_JOJO_AI, ...bots.filter((b) => b.id !== DEFAULT_JOJO_AI.id)]

  return (
    <ChatSidebar currentChatId={activeChatId ?? undefined} currentBotId={botId}>
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden px-4 pt-4">
      <div
        ref={scrollContainerRef}
        className="flex h-full flex-col scrollbar-none relative flex-1 space-y-4 overflow-y-auto"
      >
        {showEmptyState ? (
          <div className="flex h-full w-full max-w-full flex-auto flex-col items-center justify-center px-3">
            <img
              alt={botName}
              width={80}
              height={80}
              decoding="async"
              loading="lazy"
              className="rounded-2xl bg-muted object-cover"
              src={botIconUrl ?? JOJO_GRADIENT_ICON}
              style={{ color: 'transparent' }}
            />
            <div className="relative z-10 mt-8 flex items-center justify-center gap-1 text-center font-medium text-muted-foreground text-xl tracking-tight">
              <span className="text-muted-foreground/70">Chat with</span>
              <DropdownMenu open={jojoDropdownOpen} onOpenChange={setJojoDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="pointer-events-auto flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-muted px-3 font-medium transition-colors hover:opacity-80"
                    type="button"
                    aria-label="Select Jojo"
                  >
                    <span className="truncate-1 max-w-[220px] sm:max-w-[260px]">{botName}</span>
                    <HiChevronDown className="size-5 shrink-0 opacity-60" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="w-80 p-0 overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-lg ring-2 ring-foreground/10 min-w-[8rem] z-50"
                >
                  <div className="space-y-2 p-2">
                    {allJojos.map((j) => (
                      <div key={j.id} className="group relative overflow-hidden rounded-2xl">
                        <button
                          className="flex h-full w-full cursor-pointer gap-5 rounded-2xl p-2 text-left transition-all hover:bg-muted"
                          type="button"
                          onClick={() => {
                            navigate({
                              to: `/chat/${j.id}/new`,
                            })
                            setJojoDropdownOpen(false)
                          }}
                        >
                          <div className="relative h-fit w-fit">
                            <div className="w-16 h-16 relative flex-none shrink-0 overflow-hidden rounded-2xl">
                              <img
                                alt={j.name}
                                loading="lazy"
                                decoding="async"
                                className="object-cover absolute h-full w-full inset-0 text-transparent"
                                src={j.id === 'jojo-ai' ? JOJO_GRADIENT_ICON : j.iconUrl}
                              />
                            </div>
                          </div>
                          <div className="mt-1">
                            <h3 className="truncate-1 mb-1.5 font-medium text-lg leading-tight text-foreground">{j.name}</h3>
                            <p className="truncate-3 text-muted-foreground text-sm leading-normal line-clamp-3">
                              {j.id === 'jojo-ai' ? 'Default Jojo chat experience' : j.description}
                            </p>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mx-auto mt-8 flex w-full max-w-2xl flex-col gap-0">
              {EMPTY_CHAT_QUESTIONS.map((q) => (
                <button
                  key={q.id}
                  className="group flex w-full items-center justify-between gap-4 rounded-2xl p-2 hover:bg-muted"
                  type="button"
                  onClick={() => setInput(`${q.prefix} ${q.suffix}`)}
                >
                  <div className={cn('rounded-xl p-2', q.iconBg, q.iconColor)}>
                    <q.icon className="size-6" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate-2 text-pretty text-left font-medium text-base">
                      {q.prefix}{' '}
                      <span className="text-muted-foreground">{q.suffix}</span>
                    </h3>
                  </div>
                  <HiArrowCircleDown className="size-6 shrink-0 opacity-30 transition-opacity group-hover:opacity-60" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="pointer-events-none sticky top-0 z-[5] h-0 w-full flex-none">
              <div className="absolute top-0 right-0 left-0 h-12 bg-gradient-to-b from-background to-transparent transition-opacity opacity-0"></div>
            </div>
            <div className="relative isolate z-0">
              <input type="hidden" value={activeChatId ?? ''} name="chatID" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-col gap-2 py-12">
                  {error && (
                    <div className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
                      {error.message}
                    </div>
                  )}
                  {messages.map((msg) =>
                    msg.role === 'user' ? (
                      <div key={msg.id} className="flex flex-col gap-2 mt-4">
                        <div className="relative flex-col gap-1 text-left not-prose ml-auto max-w-[75%] rounded-2xl bg-accent-primary px-3 py-2">
                          <div className="w-full max-w-full space-y-2">
                            <div className="prose dark:prose-invert max-w-none leading-relaxed">
                              <Streamdown {...streamdownBaseProps} mode="static">
                                {msg.content}
                              </Streamdown>
                            </div>
                          </div>
                        </div>
                        {msg.experimental_attachments && msg.experimental_attachments.length > 0 && (
                          <div className="relative ml-auto min-w-0 max-w-[75%]">
                            <div className="scrollbar-none flex flex-row items-end gap-2 overflow-x-auto pb-2">
                              {msg.experimental_attachments.map((att, i) => (
                                att.url && (
                                  <div key={i} className="flex-none">
                                    <div className="relative">
                                      <div className="relative flex h-20 min-h-20 min-w-[72px] max-w-[160px] shrink-0 items-center justify-center overflow-hidden rounded-xl cursor-pointer">
                                        <ChatImage storageUrl={att.url} className="max-h-full max-w-full object-contain transition-opacity" />
                                        <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-foreground/10 ring-inset"></div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div key={msg.id} className="relative flex-col gap-1 text-left w-full">
                        <div className="mt-4 flex items-center gap-2 mb-2">
                          <img alt="Jojo AI" loading="lazy" width="28" height="28" decoding="async" className="flex-none rounded-xl border-2 border-white ring-2 ring-background dark:border-white/20 bg-black object-cover" src="https://assets.revisiondojo.com/assets/icons/jojo.svg" style={{ color: 'transparent' }} />
                          <span className="font-medium">Jojo</span>
                        </div>
                        <div className="w-full max-w-full space-y-2">
                          <div className="prose dark:prose-invert max-w-none leading-relaxed">
                            {msg.parts && msg.parts.length > 0
                              ? msg.parts.map((part, i) => {
                                  const isLastPart = i === msg.parts!.length - 1
                                  const isLastMessage = messages[messages.length - 1]?.id === msg.id
                                  const isStreaming = isLoading && isLastMessage && isLastPart && part.type === 'text'
                                  return part.type === 'text' ? (
                                    <Streamdown
                                      key={i}
                                      {...streamdownBaseProps}
                                      mode={isStreaming ? 'streaming' : 'static'}
                                      {...(isStreaming ? { caret: 'block' as const, isAnimating: true } : {})}
                                    >
                                      {part.text}
                                    </Streamdown>
                                  ) : (
                                    <div key={part.toolCall.id} className="my-4">
                                      <ToolRenderer toolCall={part.toolCall} />
                                    </div>
                                  )
                                })
                              : (
                                <>
                                  <Streamdown {...streamdownBaseProps} mode={isLoading && messages[messages.length - 1]?.id === msg.id ? 'streaming' : 'static'} {...(isLoading && messages[messages.length - 1]?.id === msg.id ? { caret: 'block' as const, isAnimating: true } : {})}>
                                    {msg.content}
                                  </Streamdown>
                                  {msg.toolCalls?.map((tc) => (
                                    <div key={tc.id} className="my-4">
                                      <ToolRenderer toolCall={tc} />
                                    </div>
                                  ))}
                                </>
                              )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                  {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                    <div className="w-full">
                      <div className="mt-2 flex items-center justify-between gap-2 py-2 text-muted-foreground">
                        <span className="animate-shimmer font-medium text-sm">Jojo is thinking deeper...</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-1">
                  {followUpQuestions.map((q, i) => (
                    <button
                      key={i}
                      className="inline-flex items-center font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ring-2 ring-inset text-sm rounded-2xl text-accent-fuchsia-foreground ring-accent-fuchsia-foreground/25 hover:bg-accent-fuchsia hover:ring-accent-fuchsia-foreground/50 focus-visible:ring-accent-fuchsia/50 w-full shrink-0 justify-between gap-2 px-3 py-2"
                      onClick={() => handleCustomSubmit(undefined, { text: q, imageUrls: [] })}
                    >
                      <div className="truncate-3 text-balance text-left"><p>{q}</p></div>
                      <HiReply className="size-5 flex-none opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="h-0"></div>
            <div className="pointer-events-none sticky bottom-0 z-[5] h-0 w-full flex-none">
              <div className="absolute right-0 bottom-0 left-0 h-12 bg-gradient-to-t from-background to-transparent transition-opacity opacity-0"></div>
            </div>
            <div
              className={cn(
                'sticky bottom-4 z-20 mx-auto flex w-fit flex-none justify-center transition-opacity duration-200',
                isAtBottom ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
              )}
            >
              <button
                className="flex select-none items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-background shadow-lg transition-colors"
                type="button"
                onClick={() => scrollToBottom('smooth')}
              >
                <span className="font-medium text-sm">New messages</span>
                <HiArrowCircleDown className="-mr-1 h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>
      <div className="sticky inset-x-0 bottom-0 flex justify-center pb-4 sm:inset-x-4 sm:bottom-0.5">
        <div className="w-full max-w-3xl">
           <Chatbox
              input={input ?? ''}
              setInput={setInput}
              onSubmit={handleCustomSubmit}
              loading={isLoading}
           />
        </div>
      </div>
    </div>
    <Modal open={isCreatingAccount}>
      <ModalContent showClose={false} onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <ModalHeader>
          <ModalTitle>Setting up...</ModalTitle>
          <ModalDescription>Please wait while we prepare your session.</ModalDescription>
        </ModalHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="size-8 animate-spin rounded-full border-[3px] border-foreground/20 border-t-foreground" />
          <p className="text-muted-foreground text-sm">{creationStatus || 'Something cool is probably happening...'}</p>
        </div>
      </ModalContent>
    </Modal>
    </ChatSidebar>
  )
}
