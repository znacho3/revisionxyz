import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/coursework-exemplars')({
  component: ExemplarsLayout,
})

function ExemplarsLayout() {
  return <Outlet />
}
