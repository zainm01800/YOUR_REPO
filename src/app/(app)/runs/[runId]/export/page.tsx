import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getRepository } from "@/lib/data";

export default async function ExportPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
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
        eyebrow="Export"
        title="Choose the finance-ready output"
        description="Exports keep human-readable column names, clean formatting, and only include rows that are ready to leave the review workspace."
        actions={
          <Link href={`/runs/${run.id}/review`}>
            <Button variant="secondary">Back to review</Button>
          </Link>
        }
      />
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-2xl font-semibold">Excel export</h2>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            Includes frozen headers, sensible widths, and finance-friendly column names.
          </p>
          <a href={`/api/runs/${run.id}/export?format=xlsx`}>
            <Button className="w-full">Download .xlsx</Button>
          </a>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-2xl font-semibold">CSV export</h2>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            Lightweight output for downstream import or spreadsheet review.
          </p>
          <a href={`/api/runs/${run.id}/export?format=csv`}>
            <Button className="w-full">Download .csv</Button>
          </a>
        </Card>
      </div>
      <Card>
        <h2 className="text-xl font-semibold">Rows ready for export</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          {rows.filter((row) => !row.excludedFromExport).length} of {rows.length} rows are included in the next export.
        </p>
      </Card>
    </>
  );
}

