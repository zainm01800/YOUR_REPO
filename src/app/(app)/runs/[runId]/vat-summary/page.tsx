import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, Info, Lock } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getRepository } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

function fmt(n: number, currency: string) {
  return formatCurrency(Math.round(n * 100) / 100, currency);
}

export default async function VatSummaryPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const repository = await getRepository();
  const run = await repository.getRun(runId);

  if (!run) notFound();

  const rows = await repository.getRunRows(runId);
  const currency = run.defaultCurrency ?? "GBP";
  const exportable = rows.filter((r) => !r.excludedFromExport && !r.exceptions.some((e) => e.severity === "high"));

  // ── Group by VAT code ────────────────────────────────────────────────────
  type VatGroup = {
    vatCode: string;
    vatPercent: number;
    rowCount: number;
    net: number;
    vat: number;
    gross: number;
    claimable: boolean;
  };

  const groups = new Map<string, VatGroup>();

  for (const row of exportable) {
    const key = row.vatCode || "NO_CODE";
    const net = row.netInRunCurrency ?? row.net ?? 0;
    const vat = row.vatInRunCurrency ?? row.vat ?? 0;
    const gross = row.grossInRunCurrency ?? row.gross ?? 0;
    const isForeignVat = row.exceptions.some((e) => e.code === "foreign_vat_not_claimable");
    const claimable = !!row.vatCode && !isForeignVat;

    const existing = groups.get(key);
    if (existing) {
      existing.rowCount += 1;
      existing.net += net;
      existing.vat += vat;
      existing.gross += gross;
    } else {
      groups.set(key, {
        vatCode: row.vatCode || "—",
        vatPercent: row.vatPercent ?? 0,
        rowCount: 1,
        net,
        vat,
        gross,
        claimable,
      });
    }
  }

  const claimableGroups = Array.from(groups.values())
    .filter((g) => g.claimable)
    .sort((a, b) => b.vatPercent - a.vatPercent);

  const nonClaimableGroups = Array.from(groups.values())
    .filter((g) => !g.claimable)
    .sort((a, b) => b.gross - a.gross);

  const totalClaimableNet = claimableGroups.reduce((s, g) => s + g.net, 0);
  const totalClaimableVat = claimableGroups.reduce((s, g) => s + g.vat, 0);
  const totalClaimableGross = claimableGroups.reduce((s, g) => s + g.gross, 0);
  const totalNonClaimableVat = nonClaimableGroups.reduce((s, g) => s + g.vat, 0);
  const totalNonClaimableGross = nonClaimableGroups.reduce((s, g) => s + g.gross, 0);
  const totalGross = totalClaimableGross + totalNonClaimableGross;

  const unapproved = rows.filter((r) => !r.approved && !r.excludedFromExport).length;

  return (
    <>
      <PageHeader
        eyebrow="VAT Return Summary"
        title="Input tax breakdown for this reconciliation"
        description="Claimable VAT by rate and code — ready for your VAT return preparation. All amounts shown in the run's home currency."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href={`/runs/${run.id}/review`}>
              <Button variant="secondary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to review
              </Button>
            </Link>
            <Link href={`/runs/${run.id}/export`}>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Export run
              </Button>
            </Link>
          </div>
        }
      />

      {/* Run info bar */}
      <Card className="flex flex-wrap items-center gap-6 p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Run</div>
          <div className="mt-0.5 font-semibold">{run.name}</div>
        </div>
        {run.period && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Period</div>
            <div className="mt-0.5 font-semibold">{run.period}</div>
          </div>
        )}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Currency</div>
          <div className="mt-0.5 font-semibold">{currency}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Rows included</div>
          <div className="mt-0.5 font-semibold">{exportable.length} of {rows.length}</div>
        </div>
        {run.locked && (
          <div className="ml-auto flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2">
            <Lock className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">
              Period locked · {run.lockedBy} · {run.lockedAt ? new Date(run.lockedAt).toLocaleDateString("en-GB") : ""}
            </span>
          </div>
        )}
      </Card>

      {/* Unapproved warning */}
      {unapproved > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <Info className="h-4 w-4 shrink-0" />
          {unapproved} row{unapproved !== 1 ? "s are" : " is"} not yet approved and excluded from this summary.
          <Link href={`/runs/${run.id}/review`} className="ml-auto font-semibold underline underline-offset-2">
            Go to review →
          </Link>
        </div>
      )}

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total gross spend", value: fmt(totalGross, currency), accent: false },
          { label: "VAT reclaimable", value: fmt(totalClaimableVat, currency), accent: true },
          { label: "Non-reclaimable VAT", value: fmt(totalNonClaimableVat, currency), accent: false },
          { label: "Net spend (ex. VAT)", value: fmt(totalClaimableNet, currency), accent: false },
        ].map(({ label, value, accent }) => (
          <Card key={label} className={accent ? "border-emerald-200 bg-emerald-50" : ""}>
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{label}</div>
            <div className={`mt-2 text-2xl font-bold tabular-nums ${accent ? "text-emerald-700" : ""}`}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Claimable VAT table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-[var(--color-foreground)]">Reclaimable Input Tax</span>
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {fmt(totalClaimableVat, currency)}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Grouped by VAT code. Use these figures for Box 4 of your UK VAT return.
          </p>
        </div>
        {claimableGroups.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-muted-foreground)]">
            No claimable VAT found in this run.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-5 py-3">VAT Code</th>
                <th className="px-5 py-3">Rate</th>
                <th className="px-5 py-3 text-right">Rows</th>
                <th className="px-5 py-3 text-right">Net ({currency})</th>
                <th className="px-5 py-3 text-right">VAT ({currency})</th>
                <th className="px-5 py-3 text-right">Gross ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {claimableGroups.map((g) => (
                <tr key={g.vatCode} className="hover:bg-[var(--color-panel)]">
                  <td className="px-5 py-3 font-mono font-semibold">{g.vatCode}</td>
                  <td className="px-5 py-3">{g.vatPercent.toFixed(1)}%</td>
                  <td className="px-5 py-3 text-right tabular-nums">{g.rowCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{fmt(g.net, currency)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-emerald-700">{fmt(g.vat, currency)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{fmt(g.gross, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-[var(--color-border)] bg-[var(--color-panel)]">
              <tr>
                <td className="px-5 py-3 font-semibold" colSpan={3}>Total reclaimable</td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums">{fmt(totalClaimableNet, currency)}</td>
                <td className="px-5 py-3 text-right font-bold tabular-nums text-emerald-700">{fmt(totalClaimableVat, currency)}</td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums">{fmt(totalClaimableGross, currency)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </Card>

      {/* Non-claimable VAT table */}
      {nonClaimableGroups.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-[var(--color-foreground)]">Non-Reclaimable VAT</span>
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {fmt(totalNonClaimableVat, currency)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Foreign VAT, blocked categories, or unrecognised tax codes. Do not include in Box 4.
            </p>
          </div>
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-5 py-3">VAT Code / Reason</th>
                <th className="px-5 py-3 text-right">Rows</th>
                <th className="px-5 py-3 text-right">VAT ({currency})</th>
                <th className="px-5 py-3 text-right">Gross ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {nonClaimableGroups.map((g) => (
                <tr key={g.vatCode} className="hover:bg-[var(--color-panel)]">
                  <td className="px-5 py-3 font-mono">{g.vatCode}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{g.rowCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-amber-600">{fmt(g.vat, currency)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{fmt(g.gross, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* UK MTD Box reference */}
      <Card className="flex items-start gap-4 border-[var(--color-accent)] bg-[var(--color-accent-soft)]">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" />
        <div className="text-sm leading-6 text-[var(--color-foreground)]">
          <span className="font-semibold">UK MTD VAT return:</span>{" "}
          Use the <span className="font-semibold">VAT Reclaimable ({fmt(totalClaimableVat, currency)})</span> figure for{" "}
          <span className="font-mono font-semibold">Box 4</span> (VAT reclaimed on purchases). The{" "}
          <span className="font-semibold">Net spend ({fmt(totalClaimableNet, currency)})</span> feeds{" "}
          <span className="font-mono font-semibold">Box 7</span> (total value of purchases).{" "}
          Always reconcile these figures against your accounting software before submission.
        </div>
      </Card>
    </>
  );
}
