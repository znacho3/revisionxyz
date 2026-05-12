import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { CentralIcon } from '@central-icons-react/all'
import { HiPlus, HiTrash } from 'react-icons/hi'
import { TbDotsVertical } from 'react-icons/tb'
import { cn } from '@/lib/utils'
import { getChats, deleteChat, type StoredChat } from '@/lib/chatStorage'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function getTimeGroup(timestamp: number): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayMs = 86400000
  const startOfDay = today.getTime()
  const clampedTs = Math.min(timestamp, startOfDay)
  const diffDays = Math.floor((startOfDay - clampedTs) / dayMs)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'This Week'
  if (diffDays < 30) return 'This Month'
  return 'Older Chats'
}

const TIME_GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older Chats']

type ChatSidebarProps = {
  currentChatId?: string
  currentBotId?: string
  children: React.ReactNode
}

export function ChatSidebar({ currentChatId, currentBotId, children }: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('chat-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [isContentVisible, setIsContentVisible] = useState(!collapsed)
  const [chats, setChats] = useState<StoredChat[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (collapsed) {
      const t = setTimeout(() => setIsContentVisible(false), 300)
      return () => clearTimeout(t)
    }
    setIsContentVisible(true)
  }, [collapsed])

  useEffect(() => {
    setChats(getChats())
  }, [])

  useEffect(() => {
    const handler = () => setChats(getChats())
    window.addEventListener('chat-storage-updated', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('chat-storage-updated', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('chat-sidebar-collapsed', String(collapsed))
    } catch {}
  }, [collapsed])

  const grouped = useMemo(() => {
    const groups: Record<string, StoredChat[]> = {}
    for (const chat of chats) {
      const group = getTimeGroup(chat.updatedAt)
      if (!groups[group]) groups[group] = []
      groups[group].push(chat)
    }
    return TIME_GROUP_ORDER.filter((g) => groups[g]).map((g) => ({
      label: g,
      chats: groups[g],
    }))
  }, [chats])

  const handleNewChat = () => {
    const botId = currentBotId || 'jojo-ai'
    navigate({ to: `/chat/${botId}/new` })
  }

  const handleDelete = (chatId: string) => {
    const isCurrent = chatId === currentChatId
    deleteChat(chatId)
    if (isCurrent) {
      navigate({ to: '/bots' })
    }
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <aside
        className={cn(
          'relative flex-none h-full transition-[width] duration-300 ease-in-out overflow-hidden',
          collapsed ? 'w-16' : 'w-72',
        )}
      >
        <div
          className={cn(
            'scrollbar-none absolute top-0 left-0 z-50 flex h-full w-full flex-col overflow-y-auto overflow-x-hidden rounded-r-2xl bg-background pb-0 pt-3 transition-[width,padding] duration-300 ease-in-out',
            !collapsed && 'border-border border-r-2',
          )}
        >
          <div className="relative flex flex-shrink-0 items-center gap-2 pl-3 pr-2 pb-2 transition-[padding] duration-300 ease-in-out">
            <div
              className={cn(
                'flex min-w-0 flex-1 items-center transition-all duration-300 ease-in-out',
                collapsed ? 'w-0 overflow-hidden opacity-0 pointer-events-none' : 'opacity-100',
              )}
            >
              <button
                type="button"
                onClick={handleNewChat}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-2xl bg-accent-primary-foreground! px-4 py-2 font-medium text-accent-primary! ring-offset-background transition-all hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <HiPlus className="size-5 opacity-60 shrink-0" aria-hidden />
                <span className="truncate">New chat</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                'inline-flex size-10 shrink-0 items-center justify-center rounded-2xl text-muted-foreground transition-all duration-300 ease-in-out hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50',
                collapsed && 'absolute right-3',
              )}
              aria-label={collapsed ? 'Expand chat sidebar' : 'Collapse chat sidebar'}
            >
              <CentralIcon join="round" fill="outlined" stroke="2" radius="2" name="IconSidebarSimpleLeftWide" size={24} ariaHidden />
            </button>
          </div>
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col py-2 px-3 transition-[opacity] duration-300 ease-in-out',
              collapsed && 'overflow-hidden opacity-0 pointer-events-none min-w-0',
            )}
          >
            {isContentVisible && (
              <>
                <div className="flex flex-1 flex-col">
                  <div className="flex flex-col gap-2">
                    {grouped.map((group) => (
                      <div key={group.label} className="mt-2 flex flex-col gap-1">
                        <h3 className="flex items-center gap-2 px-3 font-bold text-accent-primary-foreground text-xs uppercase tracking-wide">
                          {group.label}
                          <hr className="flex-auto border-border border-b" />
                        </h3>
                        {group.chats.map((chat) => (
                          <div
                            key={chat.id}
                            className={cn(
                              'group relative flex items-center justify-between rounded-xl py-1 pr-1 pl-3 hover:bg-muted/50',
                              chat.id === currentChatId && 'bg-muted/50',
                            )}
                          >
                            <Link
                              to="/chat/$botId/$chatId"
                              params={{ botId: chat.botId, chatId: chat.id }}
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
                            >
                              <div className="min-w-0 flex-1 truncate font-medium text-muted-foreground" title={chat.title ?? 'New chat'}>
                                {chat.title ?? 'New chat'}
                              </div>
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-2xl text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 flex-shrink-0 opacity-0 group-hover:opacity-100"
                                >
                                  <TbDotsVertical className="text-xl" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" sideOffset={4} className="min-w-[8rem] rounded-xl">
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => handleDelete(chat.id)}
                                >
                                  <HiTrash className="mr-2 text-xl" aria-hidden />
                                  Delete Chat
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    ))}
                    {chats.length === 0 && (
                      <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No chats yet
                      </div>
                    )}
                    <div className="h-1" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 h-full">
        {children}
      </div>
    </div>
  )
}
