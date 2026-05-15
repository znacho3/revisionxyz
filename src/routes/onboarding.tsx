import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { cn } from '@/lib/utils'
import { saveProfile, type SelectedSubject } from '@/lib/profile'
import ibSubjects from '@/data/ib-subjects.json'

type Subject = { slug: string; title: string; coverImageUrl: string; group: number | 'core' }

const GROUPS = [
  { id: 1 as const, label: 'Group 1', subtitle: 'Language A' },
  { id: 2 as const, label: 'Group 2', subtitle: 'Language B' },
  { id: 3 as const, label: 'Group 3', subtitle: 'Individuals & Societies' },
  { id: 4 as const, label: 'Group 4', subtitle: 'Sciences' },
  { id: 5 as const, label: 'Group 5', subtitle: 'Mathematics' },
]

const SL_ONLY = new Set(
  (ibSubjects as Subject[]).filter(s => s.title.toLowerCase().includes('ab initio')).map(s => s.slug)
)

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [activeGroup, setActiveGroup] = useState(1)
  const [selected, setSelected] = useState<SelectedSubject[]>([])
  const [saving, setSaving] = useState(false)

  const subjects = ibSubjects as Subject[]
  const groupSubjects = subjects.filter(s => s.group === activeGroup)
  const canAdd = selected.length < 6
  const ready = selected.length === 6

  function toggle(slug: string) {
    setSelected(prev => {
      if (prev.find(s => s.slug === slug)) return prev.filter(s => s.slug !== slug)
      if (!canAdd) return prev
      return [...prev, { slug, level: 'sl' }]
    })
  }

  function setLevel(slug: string, level: 'hl' | 'sl') {
    if (SL_ONLY.has(slug) && level === 'hl') return
    setSelected(prev => prev.map(s => s.slug === slug ? { ...s, level } : s))
  }

  async function submit() {
    if (!user || !ready || saving) return
    setSaving(true)
    try {
      await saveProfile(user.id, selected)
      navigate({ to: '/' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3.5">
        <img src="/assets/logo-icon.svg" alt="" className="size-7 rounded-[8px] dark:[filter:invert(1)_hue-rotate(180deg)]" />
        <span className="font-manrope font-extrabold text-base tracking-tight text-foreground">RevisionXYZ</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{selected.length}/6 subjects</span>
          <div className="flex gap-1">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={cn('h-1.5 w-5 rounded-full transition-colors', i < selected.length ? 'bg-foreground' : 'bg-border')} />
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Left: subject browser */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-5 pt-5 pb-3">
            <h1 className="font-manrope text-2xl font-bold tracking-tight text-foreground">Choose your 6 IB subjects</h1>
            <p className="mt-1 text-sm text-muted-foreground">Click a subject to add it, then set HL or SL. Theory of Knowledge is included automatically.</p>
          </div>

          {/* Group tabs */}
          <div className="flex gap-1 overflow-x-auto px-5 pb-2 scrollbar-none">
            {GROUPS.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroup(g.id)}
                className={cn(
                  'shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
                  activeGroup === g.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {g.label}
                <span className="ml-1.5 text-xs opacity-60">{g.subtitle}</span>
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mt-2">
              {groupSubjects.map(subject => {
                const sel = selected.find(s => s.slug === subject.slug)
                const slOnly = SL_ONLY.has(subject.slug)
                const disabled = !sel && !canAdd

                return (
                  <div
                    key={subject.slug}
                    className={cn(
                      'relative flex flex-col rounded-2xl border-2 transition-all',
                      sel ? 'border-foreground' : 'border-border',
                      disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer hover:border-foreground/40'
                    )}
                  >
                    <div onClick={() => toggle(subject.slug)} className="p-2.5">
                      <div className="aspect-[3/4] overflow-hidden rounded-xl bg-muted">
                        <img
                          src={subject.coverImageUrl}
                          alt={subject.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <p className="mt-2 text-xs font-medium leading-tight text-foreground line-clamp-2">{subject.title}</p>
                    </div>

                    {sel && (
                      <div className="mt-auto flex border-t border-border" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setLevel(subject.slug, 'hl')}
                          disabled={slOnly}
                          className={cn(
                            'flex-1 rounded-bl-2xl py-1.5 text-xs font-bold transition-colors',
                            sel.level === 'hl' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                            slOnly && 'cursor-not-allowed opacity-25'
                          )}
                        >HL</button>
                        <div className="w-px bg-border" />
                        <button
                          type="button"
                          onClick={() => setLevel(subject.slug, 'sl')}
                          className={cn(
                            'flex-1 rounded-br-2xl py-1.5 text-xs font-bold transition-colors',
                            sel.level === 'sl' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
                          )}
                        >SL</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: selection summary (desktop) */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-2 border-l border-border p-4">
          <div className="mb-1">
            <h2 className="font-semibold text-foreground">Your subjects</h2>
            <p className="text-xs text-muted-foreground">{selected.length} of 6 selected</p>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {selected.map(s => {
              const subject = subjects.find(sub => sub.slug === s.slug)
              if (!subject) return null
              return (
                <div key={s.slug} className="flex items-center gap-2 rounded-xl border border-border p-2">
                  <img src={subject.coverImageUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 text-xs font-medium leading-tight text-foreground line-clamp-2">{subject.title}</span>
                  <span className="shrink-0 text-xs font-bold text-muted-foreground">{s.level.toUpperCase()}</span>
                  <button
                    type="button"
                    onClick={() => toggle(s.slug)}
                    className="shrink-0 text-base leading-none text-muted-foreground hover:text-foreground"
                  >×</button>
                </div>
              )
            })}

            {/* Empty slots */}
            {Array.from({ length: 6 - selected.length }, (_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-dashed border-border p-2 opacity-40">
                <div className="size-8 shrink-0 rounded-lg bg-muted" />
                <span className="text-xs text-muted-foreground">Select a subject…</span>
              </div>
            ))}

            {/* ToK – always included */}
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 p-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">ToK</div>
              <span className="min-w-0 flex-1 text-xs font-medium leading-tight text-muted-foreground">Theory of Knowledge</span>
              <span className="shrink-0 text-xs text-muted-foreground">Core</span>
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={!ready || saving}
            className={cn(
              'mt-2 w-full rounded-2xl py-2.5 text-sm font-semibold transition-all',
              ready ? 'cursor-pointer bg-foreground text-background hover:bg-foreground/80' : 'cursor-not-allowed bg-muted text-muted-foreground'
            )}
          >
            {saving ? 'Saving…' : ready ? 'Get started →' : `${6 - selected.length} more to go`}
          </button>
        </aside>
      </div>

      {/* Mobile bottom bar */}
      <div className="flex shrink-0 items-center gap-3 border-t border-border bg-background px-4 py-3 lg:hidden">
        <span className="flex-1 text-sm text-muted-foreground">{selected.length}/6 subjects selected</span>
        <button
          type="button"
          onClick={submit}
          disabled={!ready || saving}
          className={cn(
            'rounded-xl px-5 py-2 text-sm font-semibold transition-all',
            ready ? 'cursor-pointer bg-foreground text-background hover:bg-foreground/80' : 'cursor-not-allowed bg-muted text-muted-foreground'
          )}
        >
          {saving ? 'Saving…' : ready ? 'Get started →' : `${6 - selected.length} more needed`}
        </button>
      </div>
    </div>
  )
}
