import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { CentralIcon } from '@central-icons-react/all'
import { cn } from '@/lib/utils'
import { loadProfile, saveProfile, type SelectedSubject } from '@/lib/profile'
import { centralIconPropsOutlined28 } from '@/lib/icon-props'
import ibSubjects from '@/data/ib-subjects.json'

type Subject = { slug: string; title: string; coverImageUrl: string; group: number | 'core' }

const GROUPS = [
  { id: 1 as number | 'core', label: 'Group 1 · Language A' },
  { id: 2 as number | 'core', label: 'Group 2 · Language B' },
  { id: 3 as number | 'core', label: 'Group 3 · Individuals & Societies' },
  { id: 4 as number | 'core', label: 'Group 4 · Sciences' },
  { id: 5 as number | 'core', label: 'Group 5 · Mathematics' },
]

const SL_ONLY = new Set(
  (ibSubjects as Subject[])
    .filter(s => s.title.toLowerCase().includes('ab initio'))
    .map(s => s.slug)
)

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = useUser()
  const [selected, setSelected] = useState<SelectedSubject[]>([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) { setLoadingProfile(false); return }
    loadProfile(user.id)
      .then(subjects => { setSelected(subjects); setLoadingProfile(false) })
      .catch(() => setLoadingProfile(false))
  }, [user?.id])

  const subjects = ibSubjects as Subject[]
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
      toast.success('Your subjects have been saved!')
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pt-12">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex flex-row items-center gap-4">
          <span className="rounded-2xl bg-muted p-2 text-foreground">
            <CentralIcon {...centralIconPropsOutlined28} name="IconSettingsGear1" className="size-8" />
          </span>
          <h1 className="font-manrope text-4xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>
      </div>

      {/* My Subjects section */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-manrope text-2xl font-bold tracking-tight text-foreground">My IB Subjects</h2>
          <p className="text-sm text-muted-foreground">Select exactly 6 subjects — your IB curriculum. They'll appear at the top of every study section.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 w-10 rounded-full transition-colors duration-300',
                  i < selected.length ? 'bg-violet-500 dark:bg-violet-400' : 'bg-border'
                )}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {loadingProfile ? 'Loading…' : (
              <>
                {selected.length}/6
                {selected.length > 0 && (
                  <span className="ml-1.5 text-muted-foreground/60">· {hlCount} HL · {slCount} SL</span>
                )}
              </>
            )}
          </span>
        </div>

        {loadingProfile ? (
          <p className="text-sm text-muted-foreground">Loading your subjects…</p>
        ) : (
          <>
            {GROUPS.map(g => {
              const groupSubjects = subjects.filter(s => s.group === g.id)
              return (
                <section key={String(g.id)} className="space-y-3">
                  <h3 className="font-manrope text-lg font-semibold tracking-tight text-foreground">
                    {g.label}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {groupSubjects.map(subject => {
                      const sel = selected.find(s => s.slug === subject.slug)
                      const slOnly = SL_ONLY.has(subject.slug)
                      const maxed = !sel && selected.length >= 6

                      if (sel) {
                        return (
                          <div
                            key={subject.slug}
                            className="inline-flex items-stretch overflow-hidden rounded-xl border-2 border-violet-500 text-sm font-medium dark:border-violet-400"
                          >
                            <button
                              type="button"
                              onClick={() => toggle(subject.slug)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-foreground transition-colors hover:bg-muted/50"
                            >
                              <span className="text-xs text-muted-foreground">×</span>
                              {subject.title}
                            </button>
                            <div className="w-px bg-border" />
                            <button
                              type="button"
                              onClick={() => setLevel(subject.slug, 'hl')}
                              disabled={slOnly}
                              className={cn(
                                'px-2.5 py-1.5 text-xs font-bold transition-colors',
                                sel.level === 'hl'
                                  ? 'bg-violet-500 text-white dark:bg-violet-400'
                                  : 'text-muted-foreground hover:bg-muted',
                                slOnly && 'cursor-not-allowed opacity-30'
                              )}
                            >HL</button>
                            <div className="w-px bg-border" />
                            <button
                              type="button"
                              onClick={() => setLevel(subject.slug, 'sl')}
                              className={cn(
                                'px-2.5 py-1.5 text-xs font-bold transition-colors',
                                sel.level === 'sl'
                                  ? 'bg-violet-500 text-white dark:bg-violet-400'
                                  : 'text-muted-foreground hover:bg-muted'
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
                              : 'text-foreground hover:border-violet-400 hover:bg-violet-50 dark:hover:border-violet-500 dark:hover:bg-violet-400/10'
                          )}
                        >
                          {subject.title}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}

            {/* Core (auto-included) */}
            <section className="space-y-3">
              <h3 className="font-manrope text-lg font-semibold tracking-tight text-foreground">Core</h3>
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground">
                  Theory of Knowledge
                  <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    Auto-included
                  </span>
                </div>
              </div>
            </section>

            {/* Save */}
            <div className="flex items-center justify-between border-t border-border pt-6 pb-8">
              <p className="text-sm text-muted-foreground">
                {ready
                  ? 'All 6 subjects selected. You can change them anytime.'
                  : `${6 - selected.length} more subject${6 - selected.length !== 1 ? 's' : ''} needed`}
              </p>
              <button
                type="button"
                onClick={submit}
                disabled={!ready || saving}
                className={cn(
                  'rounded-xl px-5 py-2 text-sm font-semibold transition-all',
                  ready
                    ? 'cursor-pointer bg-violet-500 text-white hover:bg-violet-600 dark:hover:bg-violet-400'
                    : 'cursor-not-allowed bg-muted text-muted-foreground'
                )}
              >
                {saving ? 'Saving…' : 'Save subjects'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
