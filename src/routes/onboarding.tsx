import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
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
  const ready = selected.length === 6
  const hlCount = selected.filter(s => s.level === 'hl').length
  const slCount = selected.filter(s => s.level === 'sl').length

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
      navigate({ to: '/' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-4 py-10 sm:py-16">

      {/* Logo — same as login page */}
      <div className="mb-8 flex items-center gap-2.5">
        <img
          src="/assets/logo-icon.svg"
          alt=""
          className="size-9 shrink-0 rounded-[10px] dark:[filter:invert(1)_hue-rotate(180deg)]"
        />
        <span className="font-manrope font-extrabold text-[24px] leading-none tracking-tight text-foreground">
          RevisionXYZ
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-background shadow-sm">

        {/* Card header */}
        <div className="border-b border-border px-6 py-5 sm:px-8 sm:py-6">
          <h1 className="font-manrope text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Set up your IB profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose 6 subjects and assign Higher Level or Standard Level to each.
            Theory of Knowledge is included automatically.
          </p>

          {/* Progress bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex gap-1.5">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 w-8 rounded-full transition-colors duration-300',
                    i < selected.length ? 'bg-foreground' : 'bg-border'
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {selected.length} / 6
              {selected.length > 0 && (
                <span className="ml-2 text-muted-foreground/70">
                  ({hlCount} HL · {slCount} SL)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Group tabs */}
        <div className="flex overflow-x-auto border-b border-border scrollbar-none">
          {GROUPS.map(g => {
            const count = selected.filter(s => subjects.find(sub => sub.slug === s.slug)?.group === g.id).length
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroup(g.id)}
                className={cn(
                  'group relative shrink-0 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap',
                  activeGroup === g.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="hidden sm:inline">Gr {g.id} · {g.label}</span>
                <span className="sm:hidden">Gr {g.id}</span>
                {count > 0 && (
                  <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                    {count}
                  </span>
                )}
                {/* Active underline */}
                <span
                  className={cn(
                    'absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-colors',
                    activeGroup === g.id ? 'bg-foreground' : 'bg-transparent'
                  )}
                />
              </button>
            )
          })}
        </div>

        {/* Subject chips */}
        <div className="min-h-[180px] px-6 py-5 sm:px-8">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-foreground transition-colors hover:bg-muted/50"
                      title="Remove"
                    >
                      <span className="text-muted-foreground text-xs">×</span>
                      {subject.title}
                    </button>
                    <div className="w-px bg-border" />
                    <button
                      type="button"
                      onClick={() => setLevel(subject.slug, 'hl')}
                      disabled={slOnly}
                      className={cn(
                        'px-2.5 py-1.5 text-xs font-bold transition-colors',
                        sel.level === 'hl' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                        slOnly && 'cursor-not-allowed opacity-30'
                      )}
                    >HL</button>
                    <div className="w-px bg-border" />
                    <button
                      type="button"
                      onClick={() => setLevel(subject.slug, 'sl')}
                      className={cn(
                        'px-2.5 py-1.5 text-xs font-bold transition-colors',
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
                      : 'text-foreground hover:border-foreground/40 hover:bg-muted/40'
                  )}
                >
                  {subject.title}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected summary + ToK */}
        {selected.length > 0 && (
          <div className="border-t border-border px-6 py-4 sm:px-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your subjects
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selected.map(s => {
                const subject = subjects.find(sub => sub.slug === s.slug)
                return (
                  <span
                    key={s.slug}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {subject?.title}
                    <span className="font-bold text-muted-foreground">{s.level.toUpperCase()}</span>
                    <button
                      type="button"
                      onClick={() => toggle(s.slug)}
                      className="leading-none text-muted-foreground transition-colors hover:text-foreground"
                    >×</button>
                  </span>
                )
              })}
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground">
                Theory of Knowledge
                <span className="font-semibold">Core</span>
              </span>
            </div>
          </div>
        )}

        {/* Footer / CTA */}
        <div className="border-t border-border px-6 py-5 sm:px-8">
          <button
            type="button"
            onClick={submit}
            disabled={!ready || saving}
            className={cn(
              'w-full rounded-2xl py-3 text-sm font-semibold transition-all',
              ready
                ? 'cursor-pointer bg-foreground text-background hover:bg-foreground/80'
                : 'cursor-not-allowed bg-muted text-muted-foreground'
            )}
          >
            {saving
              ? 'Saving…'
              : ready
              ? 'Get started →'
              : `Choose ${6 - selected.length} more subject${6 - selected.length !== 1 ? 's' : ''} to continue`}
          </button>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        You can change your subjects later in your profile settings.
      </p>
    </div>
  )
}
