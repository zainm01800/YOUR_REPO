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
  const repository = await getRepository();
  const run = await repository.getRun(runId);

  if (!run) {
    notFound();
  }

  const [rows, bankStatements] = await Promise.all([
    repository.getRunRows(runId),
    repository.getBankStatementSummaries(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Review Workspace"
        title={run.name}
        description="Approve what is clean and work exceptions in one place. Review rows, preview documents, adjust codes, and keep a clear audit trail."
        breadcrumbs={[
          { label: "All runs", href: "/runs" },
          { label: run.name },
        ]}
        actions={
          <>
            <Link href={`/runs/${run.id}/exceptions`}>
              <Button variant="secondary">Exceptions only</Button>
            </Link>
          </>
        }
      />
      <ReviewWorkspace
        run={run}
        initialRows={rows}
        initialRowId={row}
        bankStatements={bankStatements}
      />
    </>
  );
}
