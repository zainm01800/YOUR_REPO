import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { ReviewWorkspace } from "@/components/review/review-workspace";
import { getRepository } from "@/lib/data";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ row?: string }>;
}) {
  const { runId } = await params;
  const { row } = await searchParams;
  const repository = getRepository();
  const [run, rows] = await Promise.all([
    repository.getRun(runId),
    repository.getRunRows(runId),
  ]);

  if (!run) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Review Workspace"
        title="Approve what is clean and work exceptions in one place"
        description="This is the core trust layer of the product. Review rows, preview documents, adjust codes, and keep a clear audit trail."
        actions={
          <>
            <Link href={`/runs/${run.id}/exceptions`}>
              <Button variant="secondary">Exceptions only</Button>
            </Link>
            <Link href={`/runs/${run.id}/export`}>
              <Button>Export run</Button>
            </Link>
          </>
        }
      />
      <ReviewWorkspace
        run={run}
        initialRows={rows}
        initialRowId={row}
      />
    </>
  );
}
