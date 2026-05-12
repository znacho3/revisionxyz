const RD_ACCOUNTS_KEY = 'rdaccounts'

const CHAT_API =
  (import.meta as { env?: { VITE_CHAT_API_URL?: string } }).env?.VITE_CHAT_API_URL || ''

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000
const MAX_CHATS_PER_ACCOUNT = 20

export type RdAccount = {
  tag: string
  sesh: string
  expiry: number
  chatsleft: number
}

function getAccounts(): RdAccount[] {
  try {
    const raw = localStorage.getItem(RD_ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveAccounts(accounts: RdAccount[]): void {
  localStorage.setItem(RD_ACCOUNTS_KEY, JSON.stringify(accounts))
}

function isAccountValid(acc: RdAccount): boolean {
  return acc.chatsleft > 0 && acc.expiry > Date.now()
}

export function findValidAccount(currentTag?: string): RdAccount | null {
  const accounts = getAccounts()

  if (currentTag) {
    const existing = accounts.find((a) => a.tag === currentTag)
    if (existing && isAccountValid(existing)) return existing
  }

  return accounts.find(isAccountValid) ?? null
}

export async function createAccount(onStatus?: (msg: string) => void): Promise<RdAccount> {
  const res = await fetch(`${CHAT_API}/api/create`, { method: 'POST' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Account creation failed: ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  let result: { tag: string; sesh: string } | null = null

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
      if (!dataLine) continue
      let event: { type: string; message?: string; tag?: string; sesh?: string }
      try { event = JSON.parse(dataLine) } catch { continue }

      if (event.type === 'status' && event.message) {
        onStatus?.(event.message)
      } else if (event.type === 'result' && event.tag && event.sesh) {
        result = { tag: event.tag, sesh: event.sesh }
      } else if (event.type === 'error') {
        throw new Error(event.message || 'Account creation failed')
      }
    }
  }

  if (!result) throw new Error('Account creation failed: no result received')

  const account: RdAccount = {
    tag: result.tag,
    sesh: result.sesh,
    expiry: Date.now() + SIX_DAYS_MS,
    chatsleft: MAX_CHATS_PER_ACCOUNT,
  }

  const accounts = getAccounts()
  accounts.push(account)
  saveAccounts(accounts)
  return account
}

export function decrementChatsLeft(tag: string): void {
  const accounts = getAccounts()
  const acc = accounts.find((a) => a.tag === tag)
  if (acc && acc.chatsleft > 0) {
    acc.chatsleft -= 1
    saveAccounts(accounts)
  }
}
