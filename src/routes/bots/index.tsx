import { useNavigate, createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { HiChevronDown } from "react-icons/hi";
import {
  PiAtomFill,
  PiBookmarkSimpleFill,
  PiChartLineUpFill,
  PiLightbulbFill,
  PiTextSuperscriptFill,
  PiBookOpenTextFill,
  PiRocketLaunchFill,
} from 'react-icons/pi'
import { cn } from '@/lib/utils'
import { ChatSidebar } from '@/components/bots/Sidebar'
import { Chatbox, type ImageAttachment } from '@/components/bots/Chatbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const Route = createFileRoute('/bots/')({
  component: BotsPage,
})

type JojoBot = {
  id: string
  name: string
  description: string
  iconUrl: string
  emoji: string
  openingMessage: string
  suggestionPrompts: string[]
}

const JOJO_GRADIENT_ICON = 'https://pub-images.revisiondojo.com/jojo-icon/jojo.jpg'
const USER_AVATAR_URL = 'https://pub-images.revisiondojo.com/avatars/7442be9e-7636-4e35-af22-c8b2711628b8-6a0fe464-be57-41de-9f70-6d3a18d68ffa.png'

const SUGGESTIONS = [
  {
    icon: PiAtomFill,
    bgColor: "bg-sky-100 dark:bg-sky-900/50",
    iconColor: "text-sky-600 dark:text-sky-300",
    textColor: "text-sky-900 dark:text-sky-100",
    prompt: "Visually explain Big O notation"
  },
  {
    icon: PiBookmarkSimpleFill,
    bgColor: "bg-fuchsia-100 dark:bg-fuchsia-900/50",
    iconColor: "text-fuchsia-600 dark:text-fuchsia-300",
    textColor: "text-fuchsia-900 dark:text-fuchsia-100",
    prompt: "Make flashcards for the cell division process"
  },
  {
    icon: PiChartLineUpFill,
    bgColor: "bg-purple-100 dark:bg-purple-900/50",
    iconColor: "text-purple-600 dark:text-purple-300",
    textColor: "text-purple-900 dark:text-purple-100",
    prompt: "Quiz me on the pros and cons of supply side policies"
  },
  {
    icon: PiLightbulbFill,
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-300",
    textColor: "text-emerald-900 dark:text-emerald-100",
    prompt: "Help me understand the significance of CRISPR"
  },
  {
    icon: PiTextSuperscriptFill,
    bgColor: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-300",
    textColor: "text-amber-900 dark:text-amber-100",
    prompt: "Research the strengths and weaknesses of universal basic income on the current US economy"
  },
  {
    icon: PiBookOpenTextFill,
    bgColor: "bg-rose-100 dark:bg-rose-900/50",
    iconColor: "text-rose-600 dark:text-rose-300",
    textColor: "text-rose-900 dark:text-rose-100",
    prompt: "Quiz me on the kinetic theory of gases"
  },
  {
    icon: PiRocketLaunchFill,
    bgColor: "bg-indigo-100 dark:bg-indigo-900/50",
    iconColor: "text-indigo-600 dark:text-indigo-300",
    textColor: "text-indigo-900 dark:text-indigo-100",
    prompt: "Make a flow chart for the process of photosynthesis"
  },
  {
    icon: PiAtomFill,
    bgColor: "bg-teal-100 dark:bg-teal-900/50",
    iconColor: "text-teal-600 dark:text-teal-300",
    textColor: "text-teal-900 dark:text-teal-100",
    prompt: "Walk me through the Krebs cycle step by step"
  }
]

const DEFAULT_JOJO_AI: JojoBot = {
  id: 'jojo-ai',
  name: 'Jojo AI',
  description: 'Your AI study assistant',
  iconUrl: JOJO_GRADIENT_ICON,
  emoji: '🤖',
  openingMessage: 'How can I help you today?',
  suggestionPrompts: [],
}

function BotsPage() {
  const [bots, setBots] = useState<JojoBot[]>([])
  const [input, setInput] = useState('')
  const [jojoDropdownOpen, setJojoDropdownOpen] = useState(false)
  const navigate = useNavigate()

  const handleSendMessage = (e?: React.FormEvent, payload?: { text: string; imageUrls: ImageAttachment[] }) => {
    e?.preventDefault()
    const text = payload?.text ?? input
    const imageUrls = payload?.imageUrls ?? []
    if (!text.trim() && !imageUrls.length) return
    const chatId = crypto.randomUUID()
    navigate({
      to: `/chat/${DEFAULT_JOJO_AI.id}/${chatId}`,
      state: {
        initialChat: {
          text: text.trim(),
          imageUrls,
        },
      } as Record<string, unknown>,
    })
  }

  useEffect(() => {
    fetch('/bots.json')
      .then((r) => r.json())
      .then((data) => {
        const json = data?.result?.data?.json ?? {}
        const list: JojoBot[] = Object.entries(json).map(([key, value]) => {
          const bot = value as Record<string, unknown>
          return {
            id: (bot.id as string) ?? key,
            name: (bot.name as string) ?? key,
            description: (bot.description as string) ?? '',
            iconUrl: (bot.iconUrl as string) ?? '',
            emoji: (bot.emoji as string) ?? '🤖',
            openingMessage: (bot.openingMessage as string) ?? '',
            suggestionPrompts: Array.isArray(bot.initialPrompts)
              ? (bot.initialPrompts as string[])
              : [],
          }
        })
        setBots(list)
      })
      .catch(() => {})
  }, [])

  const allJojos = [DEFAULT_JOJO_AI, ...bots.filter((b) => b.id !== DEFAULT_JOJO_AI.id)]

  return (
    <ChatSidebar>
    <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto w-full max-w-5xl shrink-0 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 lg:px-8">
        <div className="relative mt-4 flex w-full flex-col items-center justify-center px-4 py-8">
          
          <div className="relative">
            <img
              alt="Jojo AI"
              loading="lazy"
              width="72"
              height="72"
              decoding="async"
              src={JOJO_GRADIENT_ICON}
              className="object-contain size-20 sm:size-24 rounded-2xl"
              style={{ color: 'transparent' }}
            />
            <img
              alt="User Avatar"
              loading="lazy"
              width="36"
              height="36"
              decoding="async"
              className="-bottom-4 -right-4 absolute rounded-xl bg-background ring-4 ring-background"
              src={USER_AVATAR_URL}
              style={{ color: 'transparent' }}
            />
          </div>

          <h1 className="relative z-10 mt-8 mb-4 text-center font-medium text-3xl tracking-tight text-foreground font-manrope">
            {DEFAULT_JOJO_AI.openingMessage}
          </h1>

          <div className="relative z-10 mb-6 flex items-center justify-center gap-1 text-center font-medium text-muted-foreground text-xl tracking-tight">
            <span className="text-muted-foreground/70">Start a new chat with</span>
            <DropdownMenu open={jojoDropdownOpen} onOpenChange={setJojoDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="pointer-events-auto flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-muted px-3 font-medium transition-colors hover:opacity-80 text-foreground"
                  type="button"
                  aria-label="Select Jojo"
                >
                  <span className="truncate-1 max-w-[220px] sm:max-w-[260px]">{DEFAULT_JOJO_AI.name}</span>
                  <HiChevronDown className="size-5 shrink-0 opacity-60" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={8} className="w-80 p-0 overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-lg ring-2 ring-foreground/10 min-w-[8rem] z-50">
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
                              src={j.id === 'jojo-ai' ? 'https://pub-images.revisiondojo.com/jojo-icon/jojo.jpg' : j.iconUrl}
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

          <div className="relative z-10 w-full max-w-xl">
            <Chatbox
              input={input}
              setInput={setInput}
              onSubmit={handleSendMessage}
            />
          </div>

          <div className="relative mt-8 w-full min-w-0 overflow-hidden">
            <div className="flex w-max min-w-0 animate-scroll-prompts gap-2 pb-4">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className={cn(
                    "min-h-[120px] w-64 shrink-0 cursor-pointer rounded-2xl p-5 transition-all duration-200 group relative flex flex-col gap-3 overflow-hidden text-left active:scale-95",
                    s.bgColor
                  )}
                  type="button"
                  onClick={() => setInput(s.prompt)}
                >
                  <s.icon className={cn("-bottom-6 -right-8 absolute size-24 opacity-15", s.iconColor)} />
                  <p className={cn("relative z-10 line-clamp-4 font-medium text-xl leading-tight tracking-tight", s.textColor)}>
                    {s.prompt}
                  </p>
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-r from-background to-transparent"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-l from-background to-transparent"></div>
          </div>          
        </div>
      </div>
    </div>
    </ChatSidebar>
  )
}
