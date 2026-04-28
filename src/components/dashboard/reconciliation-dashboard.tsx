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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RunStatusPill } from "@/components/ui/status-pill";
import { getRepository } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  trend?: { value: string; positive: boolean; data: number[] };
}) {
  const inner = (
    <Card
      className={`cm-kpi space-y-3 p-4 transition-all ${accent ? "border-[var(--accent-soft)] bg-[var(--accent-softer)]" : ""} ${href ? "hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-panel)]" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
          {label}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold ${trend.positive ? "text-emerald-600" : "text-[var(--color-danger)]"}`}>
            {trend.positive ? "up" : "down"} {trend.value}
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${accent ? "text-[var(--color-accent)]" : "text-[var(--color-foreground)]"}`}>
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

export async function ReconciliationDashboard() {
  const repository = await getRepository();
  const snapshot = await repository.getDashboardSnapshot();

  const latest = snapshot.runs[0];
  const hasRuns = snapshot.runs.length > 0;
  const currency = snapshot.workspace.defaultCurrency ?? "GBP";
  const needsReview = snapshot.runs.filter((run) => run.status === "review_required").length;
  const totalExceptions = snapshot.runs.reduce((sum, run) => sum + run.summary.exceptions, 0);
  const allGross = snapshot.runs.reduce((sum, run) => sum + (run.summary.totalGross ?? 0), 0);
  const allVatClaimable = snapshot.runs.reduce((sum, run) => sum + (run.summary.totalVatClaimable ?? 0), 0);
  const avgMatchRate =
    snapshot.runs.length > 0
      ? Math.round(snapshot.runs.reduce((sum, run) => sum + (run.summary.matchRatePct ?? 0), 0) / snapshot.runs.length)
      : 0;
  const lockedRuns = snapshot.runs.filter((run) => run.locked).length;

  const spendTrend = snapshot.runs
    .slice(0, 12)
    .reverse()
    .map((run) => {
      const gross = run.summary.totalGross ?? 0;
      const vat = run.summary.totalVatClaimable ?? run.summary.totalVat ?? 0;
      return { id: run.id, label: run.period || formatDate(run.createdAt), gross, vat, matchRate: run.summary.matchRatePct ?? 0 };
    });

  const maxTrendGross = Math.max(...spendTrend.map((e) => e.gross), 1);

  function calcTrend(values: number[]) {
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

  const recentRunHighlights = snapshot.runs
    .filter((run) => (run.summary.totalGross ?? 0) > 0 || run.summary.exceptions > 0)
    .slice(0, 5);

  return (
    <>
      <div className="rounded-[28px] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-panel)] lg:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Dashboard</p>
          <h1 className="mt-2 max-w-2xl text-[2.15rem] font-extrabold leading-[1.03] tracking-[-0.045em] text-[var(--color-foreground)] sm:text-[2.6rem]">Reconciliation control room</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">Track every run, resolve exceptions, and move approved bookkeeping data into accountant-ready exports.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--line)] bg-[var(--color-panel)] px-3 py-1 text-xs font-semibold text-[var(--color-foreground)]">
              {snapshot.runs.length} run{snapshot.runs.length !== 1 ? "s" : ""}
            </span>
            <span className="rounded-full border border-[var(--line)] bg-[var(--color-panel)] px-3 py-1 text-xs font-semibold text-[var(--color-foreground)]">
              {totalExceptions} exception{totalExceptions !== 1 ? "s" : ""}
            </span>
            <span className="rounded-full border border-[var(--line)] bg-[var(--color-panel)] px-3 py-1 text-xs font-semibold text-[var(--color-foreground)]">
              {lockedRuns} locked
            </span>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
          <Link href="/bank-statements" className="rounded-2xl border border-[var(--line-2)] bg-[var(--color-panel)] p-4 transition hover:border-[var(--color-border-strong)]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Import</p>
            <p className="mt-1 text-sm font-bold">Bank statements</p>
          </Link>
          <Link href="/runs/new" className="rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-softer)] p-4 transition hover:border-[var(--color-accent)]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">Create</p>
            <p className="mt-1 text-sm font-bold">New reconciliation run</p>
          </Link>
        </div>
      </div>
      </div>

      {!hasRuns ? (
        <div className="space-y-6">
          <Card className="cm-panel lg:flex-row lg:items-center lg:justify-between flex flex-col gap-8 overflow-hidden p-8 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-softer)] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-start gap-6 relative z-10">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]">
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
                  ].map((step) => (
                    <div key={step.label} className="group relative rounded-2xl border border-[var(--line)] bg-white p-4 transition-all hover:border-[var(--color-border-strong)]">
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-softer)] text-[var(--accent-ink)] transition-colors">
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
              <Button className="h-12 px-8 text-base">
                Start first run
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </Card>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total spend reconciled" value={formatCurrency(allGross, currency)} sub={`Across ${snapshot.runs.length} run${snapshot.runs.length !== 1 ? "s" : ""}`}
              trend={spendTrendCalc ? { value: spendTrendCalc.value, positive: spendTrendCalc.positive, data: spendTrend.map((t) => maxTrendGross ? t.gross / maxTrendGross : 0.5) } : undefined} />
            <KpiCard label="VAT reclaimable" value={formatCurrency(allVatClaimable, currency)} sub="Claimable input tax" accent href="/bookkeeping/tax-summary"
              trend={vatTrendCalc ? { value: vatTrendCalc.value, positive: vatTrendCalc.positive, data: spendTrend.map((t) => maxTrendGross ? t.vat / maxTrendGross : 0.3) } : undefined} />
            <KpiCard label="Average match rate" value={`${avgMatchRate}%`} sub="Documents matched"
              trend={matchRateTrendCalc ? { value: matchRateTrendCalc.value, positive: matchRateTrendCalc.positive, data: spendTrend.map((t) => t.matchRate / 100) } : undefined} />
            <KpiCard label="Open exceptions" value={totalExceptions} sub={`${needsReview} run${needsReview !== 1 ? "s" : ""} need review`}
              href={totalExceptions > 0 && latest ? `/runs/${latest.id}/exceptions` : undefined} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="cm-panel space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Spend over time</p>
                  <h2 className="mt-2 text-lg font-semibold">Last 12 periods</h2>
                </div>
                <span className="text-sm text-[var(--color-muted-foreground)]">{currency}</span>
              </div>
              <div className="space-y-3">
                {spendTrend.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[120px_1fr_110px_70px] items-center gap-x-3 gap-y-1.5 text-sm">
                    <span className="truncate text-[var(--color-muted-foreground)] font-medium sm:font-normal">{entry.label}</span>
                    <span className="text-right font-semibold tabular-nums sm:hidden">{formatCurrency(entry.gross, currency)}</span>
                    <div className="col-span-2 sm:col-span-1 h-3 overflow-hidden rounded-full bg-[var(--color-panel)]">
                      <div className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${Math.max((entry.gross / maxTrendGross) * 100, entry.gross > 0 ? 8 : 0)}%` }} />
                    </div>
                    <span className="hidden sm:block text-right font-semibold tabular-nums">{formatCurrency(entry.gross, currency)}</span>
                    <span className="hidden sm:block text-right text-xs text-[var(--color-muted-foreground)]">{entry.matchRate}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="cm-panel space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Review queue</p>
                  <h2 className="mt-2 text-lg font-semibold">Recent run highlights</h2>
                </div>
                <Link href="/bookkeeping/spending" className="text-sm font-semibold text-[var(--accent-ink)] decoration-[0.5px] hover:underline">Open analysis -&gt;</Link>
              </div>
              <div className="space-y-3">
                {recentRunHighlights.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--line-2)] bg-white px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
                    Import a statement or create a run to populate this queue.
                  </div>
                ) : recentRunHighlights.map((run) => {
                  const s = {
                    rowCount: run.summary.transactions,
                    exceptionRows: run.summary.exceptions,
                    gross: run.summary.totalGross ?? 0,
                    vat: run.summary.totalVatClaimable ?? run.summary.totalVat ?? 0,
                  };
                  return (
                  <div key={run.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line-2)] bg-white px-4 py-3 transition-colors hover:border-[var(--line)]">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-[var(--color-foreground)]">{run.name}</div>
                      <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{s.rowCount} row{s.rowCount !== 1 ? "s" : ""} · {s.exceptionRows} with exceptions</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold tabular-nums text-[var(--color-accent)]">{formatCurrency(s.gross, currency)}</div>
                      <div className="text-xs text-[var(--color-muted-foreground)]">VAT {formatCurrency(s.vat, currency)}</div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {totalExceptions > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[var(--color-danger)]" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Needs your attention</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {snapshot.runs.filter((run) => run.summary.exceptions > 0).slice(0, 6).map((run) => (
                  <Card key={run.id} className="flex flex-col justify-between border-l-4 border-l-[var(--color-danger)] p-4 hover:bg-[var(--color-panel)] transition-colors">
                    <div>
                      <div className="flex justify-between gap-2">
                        <span className="text-xs font-bold text-[var(--color-danger)] uppercase tracking-tight">EXCEPTION</span>
                        <span className="text-[10px] text-[var(--color-muted-foreground)] uppercase">{run.period || "Current"}</span>
                      </div>
                      <h3 className="mt-2 text-sm font-bold leading-none">{run.name}</h3>
                      <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                        {run.summary.exceptions} issue{run.summary.exceptions !== 1 ? "s" : ""} blocking this run.
                      </p>
                    </div>
                    <Link href={`/runs/${run.id}/exceptions`} className="mt-4 text-xs font-bold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1">
                      Resolve now <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-4">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Recent runs</span>
              <Link href="/runs" className="text-xs font-semibold text-[var(--accent-ink)]">View all -&gt;</Link>
            </div>
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-6 py-3">Run</th>
                  <th className="hidden px-6 py-3 sm:table-cell">Status</th>
                  <th className="px-6 py-3 text-right">Gross</th>
                  <th className="hidden px-6 py-3 text-right lg:table-cell">Match %</th>
                  <th className="hidden px-6 py-3 text-right md:table-cell">Exceptions</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {snapshot.runs.slice(0, 8).map((run) => (
                  <tr key={run.id} className="transition hover:bg-[var(--color-panel)]">
                    <td className="px-6 py-4">
                      <div className="font-semibold truncate max-w-[120px] sm:max-w-none">{run.name}</div>
                      <div className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                        {run.period ? `${run.period} - ` : ""}
                        <span className="hidden sm:inline">{formatDate(run.createdAt)}</span>
                        {run.locked && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">LOCKED</span>}
                      </div>
                    </td>
                    <td className="hidden px-6 py-4 sm:table-cell"><RunStatusPill status={run.status} /></td>
                    <td className="px-6 py-4 text-right tabular-nums font-medium">
                      {(run.summary.totalGross ?? 0) > 0 ? formatCurrency(run.summary.totalGross ?? 0, currency) : "-"}
                    </td>
                    <td className="hidden px-6 py-4 text-right tabular-nums lg:table-cell">
                      <span className={`font-medium ${(run.summary.matchRatePct ?? 0) >= 80 ? "text-emerald-600" : (run.summary.matchRatePct ?? 0) >= 50 ? "text-amber-600" : "text-[var(--color-danger)]"}`}>
                        {run.summary.matchRatePct ?? 0}%
                      </span>
                    </td>
                    <td className="hidden px-6 py-4 text-right md:table-cell">
                      {run.summary.exceptions > 0 ? (
                        <Link href={`/runs/${run.id}/exceptions`} className="font-semibold text-[var(--color-danger)]">{run.summary.exceptions}</Link>
                      ) : <span className="text-[var(--color-muted-foreground)]">0</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3 text-xs sm:text-sm">
                        <Link href={`/runs/${run.id}/review`} className="font-semibold text-[var(--color-accent)]">Review</Link>
                        <Link href={`/runs/${run.id}/export`} className="hidden sm:inline text-[var(--color-muted-foreground)]">Export</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
