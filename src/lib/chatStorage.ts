export type StoredChat = {
  id: string
  botId: string
  createdAt: number
  updatedAt: number
  title?: string
  accountTag?: string
}

export type StoredMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  experimental_attachments?: { name?: string; contentType?: string; url: string }[]
}

const CHATS_KEY = 'revisionxyz-chats'
const MESSAGES_KEY_PREFIX = 'revisionxyz-chat-messages-'

export function getChats(): StoredChat[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const arr: StoredChat[] = Array.isArray(parsed) ? parsed : []
    const byId = new Map<string, StoredChat>()
    for (const c of arr) {
      if (!c || typeof c !== 'object') continue
      const id = (c as StoredChat).id
      if (!id || typeof id !== 'string') continue
      if (!byId.has(id)) {
        byId.set(id, c as StoredChat)
      }
    }
    // exclude ghost chats that no messages
    for (const [id] of byId) {
      const hasMessages = localStorage.getItem(`${MESSAGES_KEY_PREFIX}${id}`)
      if (!hasMessages || hasMessages === '[]') byId.delete(id)
    }
    return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export function saveChat(chat: Partial<StoredChat> & Pick<StoredChat, 'id'>): void {
  const now = Date.now()
  const existingChats = getChats()
  const byId = new Map<string, StoredChat>()

  for (const c of existingChats) {
    if (!c || typeof c !== 'object') continue
    if (!c.id) continue
    if (!byId.has(c.id)) {
      byId.set(c.id, c)
    }
  }

  const prev = byId.get(chat.id)
  const merged: StoredChat =
    prev != null
      ? {
          ...prev,
          ...chat,
          createdAt: prev.createdAt ?? (chat as StoredChat).createdAt ?? now,
          updatedAt: now,
        }
      : {
          ...chat,
          id: chat.id,
          botId: chat.botId ?? '',
          createdAt: (chat as StoredChat).createdAt ?? now,
          updatedAt: now,
        }

  byId.set(chat.id, merged)

  const next = Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  localStorage.setItem(CHATS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('chat-storage-updated'))
}

export function deleteChat(chatId: string): void {
  const chats = getChats().filter((c) => c.id !== chatId)
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats))
  try {
    localStorage.removeItem(`${MESSAGES_KEY_PREFIX}${chatId}`)
  } catch {}
  window.dispatchEvent(new Event('chat-storage-updated'))
}

export function getMessages(chatId: string): StoredMessage[] {
  try {
    const raw = localStorage.getItem(`${MESSAGES_KEY_PREFIX}${chatId}`)
    if (!raw) return []
    return JSON.parse(raw) as StoredMessage[]
  } catch {
    return []
  }
}

export function saveMessages(chatId: string, messages: StoredMessage[]): void {
  try {
    const simplified = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      experimental_attachments: m.experimental_attachments,
    }))
    localStorage.setItem(`${MESSAGES_KEY_PREFIX}${chatId}`, JSON.stringify(simplified))
  } catch {}
}
