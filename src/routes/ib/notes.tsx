import { useState, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CentralIcon } from '@central-icons-react/all'
import { SubjectCard } from '@/components/ui/SubjectCard'
import ibSubjects from '@/data/ib-subjects.json'
import { centralIconPropsOutlined28 } from '@/lib/icon-props'
import { supabase } from '@/lib/supabase'
import { useMySubjects } from '@/hooks/useMySubjects'

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

export const Route = createFileRoute('/ib/notes')({
  component: IbNotesPage,
})

function IbNotesPage() {
  const allSubjects = ibSubjects as Subject[]
  const [slugsWithNotes, setSlugsWithNotes] = useState<Set<string> | null>(null)
  const mySubjects = useMySubjects()

  useEffect(() => {
    supabase
      .from('subjects')
      .select('slug')
      .eq('enable_notes', true)
      .then(({ data }) => setSlugsWithNotes(new Set((data ?? []).map((r: any) => r.slug))))
      .catch(() => setSlugsWithNotes(new Set()))
  }, [])

  const subjects = slugsWithNotes ? allSubjects.filter((s) => slugsWithNotes.has(s.slug)) : []

  const mySlugs = new Set(mySubjects?.map(s => s.slug) ?? [])
  const myAvailable = subjects.filter(s => mySlugs.has(s.slug))
  const otherSubjects = subjects.filter(s => !mySlugs.has(s.slug))

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pt-12">
      <div className="flex flex-row items-center gap-4">
        <span className="rounded-2xl bg-yellow-100 p-2 text-3xl text-yellow-700 dark:bg-yellow-400/25 dark:text-yellow-400">
          <CentralIcon {...centralIconPropsOutlined28} name="IconSketchbook" className="size-8" />
        </span>
        <h1 className="text-4xl font-bold font-manrope tracking-tight text-foreground">
          IB Notes
        </h1>
      </div>

      {slugsWithNotes === null ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          {myAvailable.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-manrope text-foreground tracking-tight">My Subjects</h2>
                <Link to="/settings" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Edit subjects
                </Link>
              </div>
              <div className="subject-card-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-4">
                {myAvailable.map((subject) => (
                  <SubjectCard
                    key={subject.slug}
                    slug={subject.slug}
                    title={subject.title}
                    coverImageUrl={subject.coverImageUrl}
                    linkToNotes
                  />
                ))}
              </div>
            </section>
          )}
          {IB_GROUPS.map(({ id, title }) => {
            const groupSubjects = otherSubjects.filter((s) => s.group === id)
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
                      linkToNotes
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
