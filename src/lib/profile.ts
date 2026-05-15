import { supabase } from './supabase'

export type SelectedSubject = { slug: string; level: 'hl' | 'sl' }

// In-memory cache so we only hit Supabase once per session
const cache: Record<string, boolean> = {}

export async function isUserOnboarded(clerkId: string): Promise<boolean> {
  if (cache[clerkId] !== undefined) return cache[clerkId]
  const { data } = await supabase
    .from('user_profiles')
    .select('onboarded_at')
    .eq('clerk_id', clerkId)
    .maybeSingle()
  const result = Boolean(data?.onboarded_at)
  cache[clerkId] = result
  return result
}

export function markOnboarded(clerkId: string) {
  cache[clerkId] = true
}

export async function saveProfile(clerkId: string, subjects: SelectedSubject[]) {
  await supabase.from('user_profiles').upsert(
    { clerk_id: clerkId, subjects, onboarded_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { onConflict: 'clerk_id' }
  )
  markOnboarded(clerkId)
}
