import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/ib/cheatsheets')({
  component: CheatsheetsLayout,
})

function CheatsheetsLayout() {
  return <Outlet />
}
