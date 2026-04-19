import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  FileSpreadsheet,
  PlusCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RunStatusPill } from "@/components/ui/status-pill";
import { getRepository } from "@/lib/data";
import { buildReviewRows } from "@/lib/reconciliation/review-rows";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Track reconciliation runs, review exceptions, and monitor spend analytics.",
};

function KpiCard({
  label,
  value,
  sub,
  accent,
  href,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  href?: string;
  trend?: {
    value: string;
    positive: boolean;
    data: number[];
  };
}) {
  const inner = (
    <Card
      className={`space-y-3 transition-all ${accent ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : ""} ${href ? "hover:scale-[1.02] hover:shadow-lg" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
          {label}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold ${trend.positive ? "text-emerald-600" : "text-[var(--color-danger)]"}`}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </div>
        )}
      </div>
      <div
        className={`text-2xl font-bold tabular-nums ${accent ? "text-[var(--color-accent)]" : "text-[var(--color-foreground)]"}`}
      >
        {value}
      </div>
      <div className="flex items-end justify-between gap-4">
        {sub ? <div className="text-xs text-[var(--color-muted-foreground)] line-clamp-1">{sub}</div> : <div />}
        {trend && (
          <div className="flex h-6 items-end gap-[1px]">
            {trend.data.map((v, i) => (
              <div
                key={i}
                className={`w-1 rounded-full ${trend.positive ? "bg-emerald-400/40" : "bg-[var(--color-danger-soft)]"}`}
                style={{ height: `${Math.max(v * 100, 15)}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function DashboardPage() {
  const repository = await getRepository();
  const [snapshot, runsWithTransactions] = await Promise.all([
    repository.getDashboardSnapshot(),
    repository.getRunsWithTransactions(),
  ]);
  const latest = snapshot.runs[0];
  const hasRuns = snapshot.runs.length > 0;
  const runSummaryById = new Map(snapshot.runs.map((run) => [run.id, run.summary]));

  const currency = snapshot.workspace.defaultCurrency ?? "GBP";
  const needsReview = snapshot.runs.filter((run) => run.status === "review_required").length;
  const totalExceptions = snapshot.runs.reduce((sum, run) => sum + run.summary.exceptions, 0);
  const allGross = snapshot.runs.reduce((sum, run) => sum + (run.summary.totalGross ?? 0), 0);
  const allVatClaimable = snapshot.runs.reduce(
    (sum, run) => sum + (run.summary.totalVatClaimable ?? 0),
    0,
  );
  const avgMatchRate =
    snapshot.runs.length > 0
      ? Math.round(
          snapshot.runs.reduce((sum, run) => sum + (run.summary.matchRatePct ?? 0), 0) /
            snapshot.runs.length,
        )
      : 0;
  const lockedRuns = snapshot.runs.filter((run) => run.locked).length;

  const runRows = runsWithTransactions.slice(0, 24).map((run) => ({
    run,
    rows: buildReviewRows(run, snapshot.vatRules, snapshot.glRules, snapshot.categoryRules),
  }));

  const spendTrend = runRows
    .slice(0, 12)
    .reverse()
    .map(({ run, rows }) => {
      const summary = runSummaryById.get(run.id);
      const gross = rows
        .filter((row) => !row.excludedFromExport)
        .reduce((sum, row) => sum + (row.grossInRunCurrency ?? row.gross ?? 0), 0);
      const vat = rows
        .filter((row) => !row.excludedFromExport)
        .reduce((sum, row) => sum + (row.vatInRunCurrency ?? row.vat ?? 0), 0);
      return {
        id: run.id,
        label: run.period || formatDate(run.createdAt),
        gross,
        vat,
        matchRate: summary?.matchRatePct ?? 0,
      };
    });

  const maxTrendGross = Math.max(...spendTrend.map((entry) => entry.gross), 1);

  // Real period-over-period trends (first half vs second half of the trend window)
  function calcTrend(values: number[]): { value: string; positive: boolean } | undefined {
    if (values.length < 2) return undefined;
    const mid = Math.floor(values.length / 2);
    const earlier = values.slice(0, mid).reduce((s, v) => s + v, 0);
    const recent = values.slice(mid).reduce((s, v) => s + v, 0);
    if (earlier === 0) return undefined;
    const pct = ((recent - earlier) / earlier) * 100;
    return { value: `${Math.abs(pct).toFixed(1)}%`, positive: pct >= 0 };
  }

  const spendTrendCalc = calcTrend(spendTrend.map((t) => t.gross));
  const vatTrendCalc = calcTrend(spendTrend.map((t) => t.vat));
  const matchRateTrendCalc = (() => {
    const rates = spendTrend.map((t) => t.matchRate);
    if (rates.length < 2) return undefined;
    const mid = Math.floor(rates.length / 2);
    const earlier = rates.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
    const recentSlice = rates.slice(mid);
    const recent = recentSlice.reduce((s, v) => s + v, 0) / recentSlice.length;
    const diff = recent - earlier;
    return { value: `${Math.abs(diff).toFixed(1)}%`, positive: diff >= 0 };
  })();

  const supplierStats = new Map<
    string,
    {
      supplier: string;
      gross: number;
      vat: number;
      exceptionRows: number;
      rowCount: number;
    }
  >();

  for (const { rows } of runRows) {
    for (const row of rows) {
      const supplier = row.supplier || "Unknown supplier";
      const current = supplierStats.get(supplier) || {
        supplier,
        gross: 0,
        vat: 0,
        exceptionRows: 0,
        rowCount: 0,
      };
      current.gross += row.grossInRunCurrency ?? row.gross ?? 0;
      current.vat += row.vatInRunCurrency ?? row.vat ?? 0;
      current.exceptionRows += row.exceptions.length > 0 ? 1 : 0;
      current.rowCount += 1;
      supplierStats.set(supplier, current);
    }
  }

  const topSuppliers = Array.from(supplierStats.values())
    .sort((left, right) => right.gross - left.gross)
    .slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Reconciliation control room"
        description="Track every run, review exceptions, and move approved data into posting files."
        actions={
          <Link href="/runs/new">
            <Button>New reconciliation run</Button>
          </Link>
        }
      />

      {!hasRuns ? (
        <div className="space-y-6">
          <Card className="hover-lift border-[var(--color-accent)] bg-linear-to-br from-[var(--color-accent-soft)] to-white glass-panel lg:flex-row lg:items-center lg:justify-between flex flex-col gap-8 p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-accent)] opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <div className="flex items-start gap-6 relative z-10">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-tr from-[var(--color-accent)] to-[var(--color-accent-strong)] text-white premium-shadow">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
                  Welcome to ClearMatch. Let&apos;s run your first reconciliation.
                </h2>
                <p className="mt-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
                  Your workspace is ready. The reconciliation control room helps you match transactions to internal records, detect VAT discrepancies, and export audit-ready reports.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    { label: "Upload transactions", desc: "CSVs or bank exports", icon: FileSpreadsheet },
                    { label: "Review auto-matches", desc: "AI-powered detection", icon: Zap },
                    { label: "Export posting file", desc: "Ready for ERP/Bank", icon: ArrowRight },
                  ].map((step, index) => (
                    <div key={step.label} className="group relative rounded-2xl border border-[var(--color-border)] bg-white/40 p-4 transition-all hover:bg-white hover:shadow-md">
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-[var(--color-accent)] group-hover:bg-[var(--color-accent)] group-hover:text-white transition-colors">
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div className="text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider">{step.label}</div>
                      <div className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">{step.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <Link href="/runs/new" className="shrink-0 relative z-10">
              <Button className="h-12 px-8 text-base hover-lift shadow-lg shadow-[var(--color-accent-soft)]">
                Start first run
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/bank-statements" className="block">
              <Card className="hover-lift p-5 space-y-3 cursor-pointer group h-full">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-sm">Import Statements</h3>
                <p className="text-xs text-[var(--color-muted-foreground)] leading-snug">Prepare your source data from bank exports or card statements.</p>
              </Card>
            </Link>
            <Link href="/settings" className="block">
              <Card className="hover-lift p-5 space-y-3 cursor-pointer group h-full">
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-sm">Review VAT Rules</h3>
                <p className="text-xs text-[var(--color-muted-foreground)] leading-snug">Configure how the system calculates reclaimable tax for your entity.</p>
              </Card>
            </Link>
            <Link href="/settings?tab=members" className="block">
              <Card className="hover-lift p-5 space-y-3 cursor-pointer group h-full">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-sm">Invite Team</h3>
                <p className="text-xs text-[var(--color-muted-foreground)] leading-snug">Give your accountant or finance team access to specific tools.</p>
              </Card>
            </Link>
            <Card className="hover-lift p-5 bg-linear-to-br from-[var(--color-panel)] to-white border-dashed border-2 flex flex-col items-center justify-center text-center">
               <p className="text-xs font-medium text-[var(--color-muted-foreground)]">Need help setting up?</p>
               <Button variant="ghost" className="mt-2 text-xs h-8">View documentation</Button>
            </Card>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total spend reconciled"
              value={formatCurrency(allGross, currency)}
              sub={`Across ${snapshot.runs.length} run${snapshot.runs.length !== 1 ? "s" : ""}`}
              trend={spendTrendCalc ? {
                value: spendTrendCalc.value,
                positive: spendTrendCalc.positive,
                data: spendTrend.map(t => maxTrendGross ? t.gross / maxTrendGross : 0.5),
              } : undefined}
            />
            <KpiCard
              label="VAT reclaimable"
              value={formatCurrency(allVatClaimable, currency)}
              sub="Claimable input tax"
              accent
              href="/bookkeeping/tax-summary"
              trend={vatTrendCalc ? {
                value: vatTrendCalc.value,
                positive: vatTrendCalc.positive,
                data: spendTrend.map(t => maxTrendGross ? t.vat / maxTrendGross : 0.3),
              } : undefined}
            />
            <KpiCard
              label="Average match rate"
              value={`${avgMatchRate}%`}
              sub="Documents matched to transactions"
              trend={matchRateTrendCalc ? {
                value: matchRateTrendCalc.value,
                positive: matchRateTrendCalc.positive,
                data: spendTrend.map(t => t.matchRate / 100),
              } : undefined}
            />
            <KpiCard
              label="Open exceptions"
              value={totalExceptions}
              sub={`${needsReview} run${needsReview !== 1 ? "s" : ""} need review`}
              href={totalExceptions > 0 && latest ? `/runs/${latest.id}/exceptions` : undefined}
            />
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <KpiCard label="Total runs" value={snapshot.runs.length} sub="All reconciliation periods" />
            <KpiCard label="Locked periods" value={lockedRuns} sub="Signed off and read-only" />
            <KpiCard label="GL rules active" value={snapshot.glRules.length} sub="Auto-suggest patterns" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="hover-lift space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                    Spend over time
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">Last 12 periods</h2>
                </div>
                <span className="text-sm text-[var(--color-muted-foreground)]">{currency}</span>
              </div>
              <div className="space-y-3">
                {spendTrend.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[120px_1fr_110px_70px] items-center gap-x-3 gap-y-1.5 text-sm">
                    <span className="truncate text-[var(--color-muted-foreground)] font-medium sm:font-normal">{entry.label}</span>
                    <span className="text-right font-semibold tabular-nums sm:hidden">
                      {formatCurrency(entry.gross, currency)}
                    </span>
                    <div className="col-span-2 sm:col-span-1 h-3 overflow-hidden rounded-full bg-[var(--color-panel)]">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-[var(--color-accent-soft)] to-[var(--color-accent)]"
                        style={{ width: `${Math.max((entry.gross / maxTrendGross) * 100, entry.gross > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                    <span className="hidden sm:block text-right font-semibold tabular-nums">
                      {formatCurrency(entry.gross, currency)}
                    </span>
                    <span className="hidden sm:block text-right text-xs text-[var(--color-muted-foreground)]">
                      {entry.matchRate}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="hover-lift space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                    Top suppliers
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">Recent peak spend</h2>
                </div>
                <Link href="/bookkeeping/spending" className="text-sm font-semibold text-[var(--color-accent)] decoration-[0.5px] hover:underline">
                  Open analysis →
                </Link>
              </div>
              <div className="space-y-3">
                {topSuppliers.map((supplier) => (
                  <div key={supplier.supplier} className="flex items-center justify-between gap-3 rounded-2xl bg-linear-to-br from-[var(--color-panel)] to-white px-4 py-3 premium-shadow transition-colors hover:bg-white">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-[var(--color-foreground)]">
                        {supplier.supplier}
                      </div>
                      <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {supplier.rowCount} row{supplier.rowCount !== 1 ? "s" : ""} · {supplier.exceptionRows} with exceptions
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold tabular-nums text-[var(--color-accent)]">
                        {formatCurrency(supplier.gross, currency)}
                      </div>
                      <div className="text-xs text-[var(--color-muted-foreground)]">
                        VAT {formatCurrency(supplier.vat, currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {hasRuns && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--color-danger)]" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Needs your attention
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {snapshot.runs
              .filter(run => run.summary.exceptions > 0)
              .slice(0, 6)
              .map(run => (
                <Card key={run.id} className="flex flex-col justify-between border-l-4 border-l-[var(--color-danger)] p-4 hover:bg-[var(--color-panel)] transition-colors">
                  <div>
                    <div className="flex justify-between gap-2">
                      <span className="text-xs font-bold text-[var(--color-danger)] uppercase tracking-tight">EXCEPTION</span>
                      <span className="text-[10px] text-[var(--color-muted-foreground)] uppercase">{run.period || "Current"}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-bold leading-none">{run.name}</h3>
                    <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                      {run.summary.exceptions} issue{run.summary.exceptions !== 1 ? "s" : ""} blocking this run from being posted.
                    </p>
                  </div>
                  <Link href={`/runs/${run.id}/exceptions`} className="mt-4 text-xs font-bold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1">
                    Resolve now <ArrowRight className="h-3 w-3" />
                  </Link>
                </Card>
              ))}
            {snapshot.runs.filter(run => run.summary.exceptions > 0).length === 0 && (
              <Card className="col-span-full flex items-center gap-3 border-l-4 border-l-emerald-500 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-700">No exceptions outstanding</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">All runs are clear — nothing needs your attention right now.</p>
                </div>
              </Card>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-4">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Recent runs
            </span>
            {hasRuns ? (
              <Link href="/runs" className="text-xs font-semibold text-[var(--color-accent)]">
                View all →
              </Link>
            ) : null}
          </div>
          {hasRuns ? (
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-6 py-3">Run</th>
                  <th className="hidden px-6 py-3 sm:table-cell">Status</th>
                  <th className="px-6 py-3 text-right">Gross</th>
                  <th className="hidden px-6 py-3 text-right lg:table-cell">Match %</th>
                  <th className="hidden px-6 py-3 text-right md:table-cell">Exceptions</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {snapshot.runs.slice(0, 8).map((run) => (
                  <tr key={run.id} className="transition hover:bg-[var(--color-panel)]">
                    <td className="px-6 py-4">
                      <div className="font-semibold truncate max-w-[120px] sm:max-w-none">{run.name}</div>
                      <div className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                        {run.period ? `${run.period} · ` : ""}
                        <span className="hidden sm:inline">{formatDate(run.createdAt)}</span>
                        {run.locked ? (
                          <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            LOCKED
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 sm:hidden">
                        <RunStatusPill status={run.status} />
                      </div>
                    </td>
                    <td className="hidden px-6 py-4 sm:table-cell">
                      <RunStatusPill status={run.status} />
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums font-medium">
                      {(run.summary.totalGross ?? 0) > 0
                        ? formatCurrency(run.summary.totalGross ?? 0, currency)
                        : "—"}
                    </td>
                    <td className="hidden px-6 py-4 text-right tabular-nums lg:table-cell">
                      <span
                        className={`font-medium ${(run.summary.matchRatePct ?? 0) >= 80 ? "text-emerald-600" : (run.summary.matchRatePct ?? 0) >= 50 ? "text-amber-600" : "text-[var(--color-danger)]"}`}
                      >
                        {run.summary.matchRatePct ?? 0}%
                      </span>
                    </td>
                    <td className="hidden px-6 py-4 text-right md:table-cell">
                      {run.summary.exceptions > 0 ? (
                        <Link
                          href={`/runs/${run.id}/exceptions`}
                          className="font-semibold text-[var(--color-danger)]"
                        >
                          {run.summary.exceptions}
                        </Link>
                      ) : (
                        <span className="text-[var(--color-muted-foreground)]">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3 text-xs sm:text-sm">
                        <Link
                          href={`/runs/${run.id}/review`}
                          className="font-semibold text-[var(--color-accent)]"
                        >
                          Review
                        </Link>
                        <Link
                          href={`/runs/${run.id}/export`}
                          className="hidden sm:inline text-[var(--color-muted-foreground)]"
                        >
                          Export
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--color-panel)]">
                <PlusCircle className="h-6 w-6 text-[var(--color-muted-foreground)]" />
              </div>
              <div>
                <p className="font-semibold">No runs yet</p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Create your first reconciliation run to get started.
                </p>
              </div>
              <Link href="/runs/new">
                <Button variant="secondary" className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  New run
                </Button>
              </Link>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          {latest ? (
            <Card className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                  Current focus
                </p>
                <h2 className="mt-2 text-xl font-semibold">{latest.name}</h2>
                {latest.period ? (
                  <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                    Period: {latest.period}
                  </p>
                ) : null}
              </div>
              <dl className="space-y-2 text-sm">
                {[
                  { label: "Transactions", value: String(latest.summary.transactions) },
                  {
                    label: "Matched",
                    value: `${latest.summary.matched} (${latest.summary.matchRatePct ?? 0}%)`,
                  },
                  {
                    label: "Gross spend",
                    value: formatCurrency(latest.summary.totalGross ?? 0, currency),
                  },
                  {
                    label: "VAT reclaimable",
                    value: formatCurrency(latest.summary.totalVatClaimable ?? 0, currency),
                  },
                  { label: "Exceptions", value: String(latest.summary.exceptions) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-[var(--color-muted-foreground)]">{label}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                <Link href={`/runs/${latest.id}/review`}>
                  <Button>Open review</Button>
                </Link>
                <Link href={`/runs/${latest.id}/vat-summary`}>
                  <Button variant="secondary">VAT summary</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                Current focus
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">No runs yet.</p>
            </Card>
          )}

          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--color-accent)]" />
              <h2 className="font-semibold">Quick actions</h2>
            </div>
            <div className="space-y-2">
              {[
                { label: "New reconciliation run", href: "/runs/new" },
                { label: "Posting File Builder", href: "/posting-file-builder" },
                { label: "Supplier analysis", href: "/suppliers" },
                { label: "Settings & VAT rules", href: "/settings" },
                { label: "Review templates", href: "/templates" },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--color-panel)]"
                >
                  {label}
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
