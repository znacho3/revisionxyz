import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { cn } from '@/lib/utils'
import { saveProfile, type SelectedSubject } from '@/lib/profile'
import ibSubjects from '@/data/ib-subjects.json'

type Subject = { slug: string; title: string; coverImageUrl: string; group: number | 'core' }

const GROUPS = [
  { id: 1, label: 'Language A' },
  { id: 2, label: 'Language B' },
  { id: 3, label: 'Individuals & Societies' },
  { id: 4, label: 'Sciences' },
  { id: 5, label: 'Mathematics' },
]

const SL_ONLY = new Set(
  (ibSubjects as Subject[])
    .filter(s => s.title.toLowerCase().includes('ab initio'))
    .map(s => s.slug)
)

export function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const { user } = useUser()
  const [activeGroup, setActiveGroup] = useState(1)
  const [selected, setSelected] = useState<SelectedSubject[]>([])
  const [saving, setSaving] = useState(false)

  const subjects = ibSubjects as Subject[]
  const groupSubjects = subjects.filter(s => s.group === activeGroup)
  const ready = selected.length === 6

  function toggle(slug: string) {
    setSelected(prev => {
      if (prev.find(s => s.slug === slug)) return prev.filter(s => s.slug !== slug)
      if (prev.length >= 6) return prev
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
      onComplete()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4">
      <div className="flex w-full max-w-lg flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-background shadow-2xl max-h-[90vh] sm:max-h-[85vh]">

        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-3">
          <h2 className="font-manrope text-xl font-bold tracking-tight text-foreground">Set up your IB profile</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pick 6 subjects and set HL or SL for each. ToK is included automatically.
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="flex gap-1">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={cn('h-1.5 w-6 rounded-full transition-colors', i < selected.length ? 'bg-foreground' : 'bg-border')}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{selected.length} / 6</span>
          </div>
        </div>

        {/* Group tabs */}
        <div className="shrink-0 flex gap-0 overflow-x-auto border-b border-border scrollbar-none">
          {GROUPS.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGroup(g.id)}
              className={cn(
                '-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                activeGroup === g.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Gr {g.id} <span className="hidden sm:inline">· {g.label}</span>
            </button>
          ))}
        </div>

        {/* Subject chips */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-2">
            {groupSubjects.map(subject => {
              const sel = selected.find(s => s.slug === subject.slug)
              const slOnly = SL_ONLY.has(subject.slug)
              const maxed = !sel && selected.length >= 6

              if (sel) {
                return (
                  <div
                    key={subject.slug}
                    className="inline-flex items-stretch overflow-hidden rounded-xl border-2 border-foreground text-sm font-medium"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(subject.slug)}
                      className="px-3 py-1.5 text-foreground hover:bg-muted/50 transition-colors"
                    >
                      {subject.title}
                    </button>
                    <div className="w-px bg-border" />
                    <button
                      type="button"
                      onClick={() => setLevel(subject.slug, 'hl')}
                      disabled={slOnly}
                      className={cn(
                        'px-2 py-1.5 text-xs font-bold transition-colors',
                        sel.level === 'hl' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                        slOnly && 'cursor-not-allowed opacity-25'
                      )}
                    >HL</button>
                    <div className="w-px bg-border" />
                    <button
                      type="button"
                      onClick={() => setLevel(subject.slug, 'sl')}
                      className={cn(
                        'px-2 py-1.5 text-xs font-bold transition-colors',
                        sel.level === 'sl' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
                      )}
                    >SL</button>
                  </div>
                )
              }

              return (
                <button
                  key={subject.slug}
                  type="button"
                  onClick={() => toggle(subject.slug)}
                  disabled={maxed}
                  className={cn(
                    'rounded-xl border-2 border-border px-3 py-1.5 text-sm font-medium transition-colors',
                    maxed
                      ? 'cursor-not-allowed opacity-40'
                      : 'text-foreground hover:border-foreground/40 hover:bg-muted/50'
                  )}
                >
                  {subject.title}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-5 py-4 space-y-3">
          {/* Selected summary */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(s => {
                const subject = subjects.find(sub => sub.slug === s.slug)
                return (
                  <span
                    key={s.slug}
                    className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-foreground"
                  >
                    {subject?.title}
                    <span className="text-muted-foreground">{s.level.toUpperCase()}</span>
                    <button
                      type="button"
                      onClick={() => toggle(s.slug)}
                      className="ml-0.5 leading-none text-muted-foreground hover:text-foreground"
                    >×</button>
                  </span>
                )
              })}
              <span className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">
                ToK · Core
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!ready || saving}
            className={cn(
              'w-full rounded-2xl py-2.5 text-sm font-semibold transition-all',
              ready
                ? 'cursor-pointer bg-foreground text-background hover:bg-foreground/80'
                : 'cursor-not-allowed bg-muted text-muted-foreground'
            )}
          >
            {saving
              ? 'Saving…'
              : ready
              ? 'Get started →'
              : `Choose ${6 - selected.length} more subject${6 - selected.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
