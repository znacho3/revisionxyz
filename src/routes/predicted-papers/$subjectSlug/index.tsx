import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/predicted-papers/$subjectSlug/")({
  component: PredictedPapersSubjectRedirect,
});

function PredictedPapersSubjectRedirect() {
  const { subjectSlug } = useParams({ strict: false });
  if (!subjectSlug) return <Navigate to="/predicted-papers" replace />;
  return <Navigate to="/ib/$subject/predicted-papers" params={{ subject: subjectSlug }} replace />;
}
