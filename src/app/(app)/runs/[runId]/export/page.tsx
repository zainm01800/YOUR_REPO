import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExportLayoutDesigner } from "@/components/export/export-layout-designer";
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
        title="Preview and shape the export before you download it"
        description="Change column order, labels, widths, and visibility with a live preview, then export the exact layout finance wants."
        actions={
          <Link href={`/runs/${run.id}/review`}>
            <Button variant="secondary">Back to review</Button>
          </Link>
        }
      />
      <ExportLayoutDesigner runId={run.id} rows={rows} />
      <Card>
        <h2 className="text-xl font-semibold">Rows ready for export</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          {rows.filter((row) => !row.excludedFromExport).length} of {rows.length} rows are included in the next export.
        </p>
      </Card>
    </>
  );
}
