import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  EyeOff,
  Tag,
  Hash,
  ArrowLeft,
  Settings2,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { ExportDownloadPanel } from "@/components/export/export-download-panel";
import { getRepository } from "@/lib/data";

function StatPill({
  label,
  value,
  tone = "neutral",
  href,
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "success" | "warning" | "danger";
  href?: string;
}) {
  const toneClasses = {
    neutral: "bg-[var(--color-panel)] border-[var(--color-border)] text-[var(--color-foreground)]",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    danger: "bg-[var(--color-danger-soft)] border-[var(--color-danger-border)] text-[var(--color-danger)]",
  };

  const inner = (
    <div className={`flex flex-col items-center rounded-2xl border px-5 py-3 text-center transition-opacity ${toneClasses[tone]} ${href ? "hover:opacity-80" : ""}`}>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="mt-0.5 text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

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
  const excludedRows = rows.length - exportableRows.length;
  const missingGl = exportableRows.filter((r) => !r.glCode).length;
  const missingVat = exportableRows.filter((r) => !r.vatCode).length;
  const unmatched = exportableRows.filter((r) => r.matchStatus === "unmatched").length;
  const unapproved = exportableRows.filter((r) => !r.approved).length;
  const hasWarnings = missingGl > 0 || missingVat > 0 || unmatched > 0;
  const allGood = !hasWarnings && unapproved === 0;

  return (
    <>
      <PageHeader
        eyebrow="Export & Output"
        title="Download your reconciliation"
        description="Review the readiness summary, then download in CSV or Excel. Column layout is configured on the Review page."
        actions={
          <Link href={`/runs/${run.id}/review`}>
            <Button variant="secondary">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to review
            </Button>
          </Link>
        }
      />

      {/* ── Readiness summary ───────────────────────────────────────── */}
      <div className={`rounded-3xl border-2 p-5 ${allGood ? "border-emerald-200 bg-emerald-50" : "border-[var(--color-danger-border)] bg-[var(--color-danger-soft)]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {allGood ? (
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 shrink-0 text-[var(--color-danger)]" />
            )}
            <div>
              <p className={`text-base font-semibold ${allGood ? "text-emerald-800" : "text-[var(--color-danger)]"}`}>
                {allGood ? "Ready to export" : "Fix issues before exporting"}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {exportableRows.length} of {rows.length} rows will be included in the download.
                {unapproved > 0 && ` ${unapproved} row${unapproved !== 1 ? "s" : ""} still unapproved.`}
              </p>
            </div>
          </div>
          {hasWarnings && (
            <Link
              href={`/runs/${run.id}/exceptions`}
              className="shrink-0 text-sm font-semibold text-[var(--color-danger)] underline underline-offset-2 hover:opacity-80"
            >
              View all exceptions →
            </Link>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill
            label="Rows to export"
            value={exportableRows.length}
            tone="neutral"
          />
          <StatPill
            label="Excluded"
            value={excludedRows}
            tone={excludedRows > 0 ? "warning" : "neutral"}
          />
          <StatPill
            label="GL code missing"
            value={missingGl}
            tone={missingGl > 0 ? "danger" : "success"}
            href={missingGl > 0 ? `/runs/${run.id}/exceptions` : undefined}
          />
          <StatPill
            label="VAT code missing"
            value={missingVat}
            tone={missingVat > 0 ? "danger" : "success"}
            href={missingVat > 0 ? `/runs/${run.id}/exceptions` : undefined}
          />
        </div>

        {/* Issue tags */}
        {hasWarnings && (
          <div className="mt-4 flex flex-wrap gap-2">
            {missingGl > 0 && (
              <Link href={`/runs/${run.id}/exceptions`}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-danger-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-danger)] hover:opacity-80">
                  <Hash className="h-3 w-3" />
                  {missingGl} missing GL code{missingGl !== 1 ? "s" : ""}
                </span>
              </Link>
            )}
            {missingVat > 0 && (
              <Link href={`/runs/${run.id}/exceptions`}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-danger-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-danger)] hover:opacity-80">
                  <Tag className="h-3 w-3" />
                  {missingVat} missing VAT code{missingVat !== 1 ? "s" : ""}
                </span>
              </Link>
            )}
            {unmatched > 0 && (
              <Link href={`/runs/${run.id}/exceptions`}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-danger-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-danger)] hover:opacity-80">
                  <FileCheck className="h-3 w-3" />
                  {unmatched} unmatched row{unmatched !== 1 ? "s" : ""}
                </span>
              </Link>
            )}
            {unapproved > 0 && (
              <Link href={`/runs/${run.id}/review`}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700 hover:opacity-80">
                  <EyeOff className="h-3 w-3" />
                  {unapproved} unapproved row{unapproved !== 1 ? "s" : ""}
                </span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Download ─────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Download
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Column layout is controlled by your active template on the Review page.
            </p>
          </div>
          <Link href={`/runs/${run.id}/review`}>
            <Button variant="secondary" className="shrink-0">
              <Settings2 className="mr-2 h-4 w-4" />
              Edit columns
            </Button>
          </Link>
        </div>
        <ExportDownloadPanel runId={run.id} />
      </div>

      {/* ── ERP CTA ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            Need an ERP-ready posting file?
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
            Transform this reconciliation into a SAP, Xero, Sage, or custom upload file with a saved output template.
          </p>
        </div>
        <Link href={`/runs/${run.id}/posting-file-builder`}>
          <Button>Open Posting File Builder →</Button>
        </Link>
      </div>
    </>
  );
}
