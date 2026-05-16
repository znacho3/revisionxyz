import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { loadProfile, type SelectedSubject } from '@/lib/profile'

export function useMySubjects(): SelectedSubject[] | null {
  const { user } = useUser()
  const [mySubjects, setMySubjects] = useState<SelectedSubject[] | null>(null)

  useEffect(() => {
    if (!user) { setMySubjects([]); return }
    loadProfile(user.id)
      .then(setMySubjects)
      .catch(() => setMySubjects([]))
  }, [user?.id])

  return mySubjects
}
