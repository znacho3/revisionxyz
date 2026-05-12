import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/predicted-papers")({
  component: PredictedPapersLayout,
});

function PredictedPapersLayout() {
  return <Outlet />;
}