import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
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
  const run = await repository.getRun(runId);

  if (!run) {
    notFound();
  }

  const rows = await repository.getRunRows(runId);

  const exportableRows = rows.filter((row) => !row.excludedFromExport);
  const missingGl = exportableRows.filter((r) => !r.glCode).length;
  const missingVat = exportableRows.filter((r) => r.vatCode === undefined || r.vatCode === null || r.vatCode === "").length;
  const unmatched = exportableRows.filter((r) => r.matchStatus === "unmatched").length;
  const unapproved = exportableRows.filter((r) => !r.approved).length;
  const hasWarnings = missingGl > 0 || missingVat > 0 || unmatched > 0;

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

      {/* Validation summary */}
      <Card className={`space-y-4 border-2 ${hasWarnings ? "border-[var(--color-danger-border)] bg-[var(--color-danger-soft)]" : "border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)]"}`}>
        <div className="flex items-start gap-3">
          {hasWarnings ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-danger)]" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" />
          )}
          <div>
            <h2 className={`text-base font-semibold ${hasWarnings ? "text-[var(--color-danger)]" : "text-[var(--color-accent)]"}`}>
              {hasWarnings ? "Review before exporting" : "Ready to export"}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {exportableRows.length} of {rows.length} rows included in export.
              {unapproved > 0 && ` ${unapproved} row${unapproved > 1 ? "s" : ""} not yet approved.`}
            </p>
          </div>
        </div>
        {hasWarnings && (
          <div className="flex flex-wrap gap-4 text-sm text-[var(--color-danger)]">
            {missingGl > 0 && (
              <span className="flex items-center gap-1.5 rounded-lg bg-[var(--color-danger-soft)] px-3 py-1.5 font-medium">
                {missingGl} row{missingGl > 1 ? "s" : ""} missing GL code
              </span>
            )}
            {missingVat > 0 && (
              <span className="flex items-center gap-1.5 rounded-lg bg-[var(--color-danger-soft)] px-3 py-1.5 font-medium">
                {missingVat} row{missingVat > 1 ? "s" : ""} missing VAT code
              </span>
            )}
            {unmatched > 0 && (
              <span className="flex items-center gap-1.5 rounded-lg bg-[var(--color-danger-soft)] px-3 py-1.5 font-medium">
                {unmatched} unmatched row{unmatched > 1 ? "s" : ""}
              </span>
            )}
            <Link href={`/runs/${run.id}/exceptions`} className="ml-auto font-semibold text-[var(--color-danger)] underline underline-offset-2">
              View exceptions →
            </Link>
          </div>
        )}
      </Card>

      <ExportLayoutDesigner runId={run.id} rows={rows} />

      {/* Posting File Builder CTA */}
      <Card className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <h2 className="text-xl font-semibold">Need an ERP-ready posting file?</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
            Use the <strong>Posting File Builder</strong> to transform this reconciliation into a SAP, Xero, Sage, or custom upload file. Apply a saved output template and download a pre-filled posting file in one click.
          </p>
        </div>
        <Link href={`/runs/${run.id}/posting-file-builder`}>
          <Button>Open Posting File Builder →</Button>
        </Link>
      </Card>
    </>
  );
}
