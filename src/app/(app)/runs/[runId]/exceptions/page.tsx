import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { ExceptionsList } from "@/components/exceptions/exceptions-list";
import { getRepository } from "@/lib/data";

export default async function ExceptionsPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const repository = await getRepository();
  const run = await repository.getRun(runId);

  if (!run) {
    notFound();
  }

  const rows = await repository.getRunRows(runId);
  const exceptionRows = rows.filter((row) => row.exceptions.length > 0);

  return (
    <>
      <PageHeader
        eyebrow="Exceptions"
        title={`${run.name} — Exceptions`}
        description="Make issues obvious instead of hiding them inside a spreadsheet export. Filter by severity or type, and jump directly to the row in review."
        breadcrumbs={[
          { label: "All runs", href: "/runs" },
          { label: run.name, href: `/runs/${run.id}/review` },
          { label: "Exceptions" },
        ]}
        actions={
          <Link href={`/runs/${run.id}/review`}>
            <Button variant="secondary">Back to review</Button>
          </Link>
        }
      />

      <ExceptionsList runId={run.id} rows={exceptionRows} />
    </>
  );
}
