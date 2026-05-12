import { createFileRoute } from '@tanstack/react-router'
import { SubjectCard } from '@/components/ui/SubjectCard'
import ibSubjects from '@/data/ib-subjects.json'

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

export const Route = createFileRoute('/ib/')({
  component: IBPage,
})

function IBPage() {
  const subjects = ibSubjects as Subject[]

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pt-12">
      <h1 className="text-5xl font-bold font-manrope tracking-tight text-foreground">
        International Baccalaureate (IB)
      </h1>

      {IB_GROUPS.map(({ id, title }) => {
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
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
