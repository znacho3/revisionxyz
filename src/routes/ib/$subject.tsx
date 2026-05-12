import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/ib/$subject')({
  component: SubjectLayout,
})

function SubjectLayout() {
  return <Outlet />
}
