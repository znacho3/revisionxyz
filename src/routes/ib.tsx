import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/ib')({
  component: IbLayout,
})

function IbLayout() {
  return <Outlet />
}
