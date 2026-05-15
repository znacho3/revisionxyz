import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CentralIcon } from '@central-icons-react/all'
import { SubjectCard } from '@/components/ui/SubjectCard'
import ibSubjects from '@/data/ib-subjects.json'
import { centralIconPropsOutlined28 } from '@/lib/icon-props'
import { supabase } from '@/lib/supabase'

type Subject = {
  slug: string
  title: string
  coverImageUrl: string
  group: number | 'core'
}

const IB_GROUPS: { id: number | 'core'; title: string }[] = [
  { id: 1, title: 'Group 1 - Language A' },
  { id: 2, title: 'Group 2 - Language B' },
  { id: 3, title: 'Group 3 - Humanities' },
  { id: 4, title: 'Group 4 - Sciences' },
  { id: 5, title: 'Group 5 - Mathematics' },
  { id: 'core', title: 'DP - Core' },
]

export const Route = createFileRoute('/ib/flashcards')({
  component: IbFlashcardsPage,
})

function IbFlashcardsPage() {
  const allSubjects = ibSubjects as Subject[]
  const [slugsWithFlashcards, setSlugsWithFlashcards] = useState<Set<string> | null>(null)

  useEffect(() => {
    supabase
      .from('subjects')
      .select('slug')
      .eq('enable_flashcards', true)
      .then(({ data }) => setSlugsWithFlashcards(new Set((data ?? []).map((r: any) => r.slug))))
      .catch(() => setSlugsWithFlashcards(new Set()))
  }, [])

  const subjects = slugsWithFlashcards ? allSubjects.filter((s) => slugsWithFlashcards.has(s.slug)) : []

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pt-12">
      <div className="flex flex-row items-center gap-4">
        <span className="rounded-2xl bg-sky-100 p-2 text-3xl text-sky-700 dark:bg-sky-400/25 dark:text-sky-300">
          <CentralIcon {...centralIconPropsOutlined28} name="IconFlashcards" className="size-8" />
        </span>
        <h1 className="text-4xl font-bold font-manrope tracking-tight text-foreground">
          IB Flashcards
        </h1>
      </div>

      {slugsWithFlashcards === null ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        IB_GROUPS.map(({ id, title }) => {
          const groupSubjects = subjects.filter((s) => s.group === id)
          if (groupSubjects.length === 0) return null
          return (
            <section key={String(id)} className="space-y-4">
              <h2 className="text-2xl font-bold font-manrope text-foreground tracking-tight">{title}</h2>
              <div className="subject-card-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-4">
                {groupSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.slug}
                    slug={subject.slug}
                    title={subject.title}
                    coverImageUrl={subject.coverImageUrl}
                    linkToFlashcards
                  />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
