import Link from "next/link";
import { ArrowRight, FileSpreadsheet, PlusCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";
import { RunStatusPill } from "@/components/ui/status-pill";
import { getRepository } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

function KpiCard({
  label,
  value,
  sub,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  href?: string;
}) {
  const inner = (
    <Card className={`space-y-1 transition-opacity ${accent ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : ""} ${href ? "hover:opacity-80" : ""}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
        {label}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${accent ? "text-[var(--color-accent)]" : "text-[var(--color-foreground)]"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--color-muted-foreground)]">{sub}</div>}
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function DashboardPage() {
  const repository = getRepository();
  const snapshot = await repository.getDashboardSnapshot();
  const latest = snapshot.runs[0];

  const needsReview = snapshot.runs.filter((r) => r.status === "review_required").length;
  const totalExceptions = snapshot.runs.reduce((s, r) => s + r.summary.exceptions, 0);
  const hasRuns = snapshot.runs.length > 0;

  const currency = snapshot.workspace.defaultCurrency ?? "GBP";
  const allGross = snapshot.runs.reduce((s, r) => s + (r.summary.totalGross ?? 0), 0);
  const allVatClaimable = snapshot.runs.reduce((s, r) => s + (r.summary.totalVatClaimable ?? 0), 0);
  const avgMatchRate = snapshot.runs.length > 0
    ? Math.round(snapshot.runs.reduce((s, r) => s + (r.summary.matchRatePct ?? 0), 0) / snapshot.runs.length)
    : 0;
  const lockedRuns = snapshot.runs.filter((r) => r.locked).length;

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

      {!hasRuns && (
        <Card className="flex flex-col gap-5 border-[var(--color-accent)] bg-[var(--color-accent-soft)] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Welcome to ClearMatch! Let's run your first reconciliation.</h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Upload a transaction export and a batch of receipts to get started.</p>
              <ol className="mt-3 space-y-1 text-sm text-[var(--color-muted-foreground)]">
                {["Create a new reconciliation run", "Upload your CSV/Excel file and receipts", "Review matches, fix exceptions, and export"].map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-white">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <Link href="/runs/new" className="shrink-0">
            <Button className="gap-2">Start first run <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </Card>
      )}

      {hasRuns && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total spend reconciled" value={formatCurrency(allGross, currency)} sub={`Across ${snapshot.runs.length} run${snapshot.runs.length !== 1 ? "s" : ""}`} />
            <KpiCard label="VAT reclaimable" value={formatCurrency(allVatClaimable, currency)} sub="Claimable input tax" accent />
            <KpiCard label="Average match rate" value={`${avgMatchRate}%`} sub="Documents matched to transactions" />
            <KpiCard label="Open exceptions" value={totalExceptions} sub={`${needsReview} run${needsReview !== 1 ? "s" : ""} need review`} href={totalExceptions > 0 && latest ? `/runs/${latest.id}/exceptions` : undefined} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="Total runs" value={snapshot.runs.length} sub="All reconciliation periods" />
            <KpiCard label="Locked periods" value={lockedRuns} sub="Signed off and read-only" />
            <KpiCard label="GL rules active" value={snapshot.glRules.length} sub="Auto-suggest patterns" />
          </div>
        </>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-4">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Recent runs</span>
            {hasRuns && <Link href="/runs" className="text-xs font-semibold text-[var(--color-accent)]">View all →</Link>}
          </div>
          {hasRuns ? (
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-6 py-3">Run</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Gross</th>
                  <th className="px-6 py-3 text-right">Match %</th>
                  <th className="px-6 py-3 text-right">Exceptions</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {snapshot.runs.slice(0, 8).map((run) => (
                  <tr key={run.id} className="transition hover:bg-[var(--color-panel)]">
                    <td className="px-6 py-4">
                      <div className="font-semibold">{run.name}</div>
                      <div className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                        {run.period ? `${run.period} · ` : ""}{formatDate(run.createdAt)}
                        {run.locked && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">LOCKED</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4"><RunStatusPill status={run.status} /></td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      {(run.summary.totalGross ?? 0) > 0 ? formatCurrency(run.summary.totalGross ?? 0, currency) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      <span className={`font-medium ${(run.summary.matchRatePct ?? 0) >= 80 ? "text-emerald-600" : (run.summary.matchRatePct ?? 0) >= 50 ? "text-amber-600" : "text-[var(--color-danger)]"}`}>
                        {run.summary.matchRatePct ?? 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {run.summary.exceptions > 0 ? (
                        <Link href={`/runs/${run.id}/exceptions`} className="font-semibold text-[var(--color-danger)]">{run.summary.exceptions}</Link>
                      ) : <span className="text-[var(--color-muted-foreground)]">0</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <Link href={`/runs/${run.id}/review`} className="font-semibold text-[var(--color-accent)]">Review</Link>
                        <Link href={`/runs/${run.id}/export`} className="text-[var(--color-muted-foreground)]">Export</Link>
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
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Create your first reconciliation run to get started.</p>
              </div>
              <Link href="/runs/new"><Button variant="secondary" className="gap-2"><PlusCircle className="h-4 w-4" /> New run</Button></Link>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          {latest ? (
            <Card className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">Current focus</p>
                <h2 className="mt-2 text-xl font-semibold">{latest.name}</h2>
                {latest.period && <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">Period: {latest.period}</p>}
              </div>
              <dl className="space-y-2 text-sm">
                {[
                  { label: "Transactions", value: String(latest.summary.transactions) },
                  { label: "Matched", value: `${latest.summary.matched} (${latest.summary.matchRatePct ?? 0}%)` },
                  { label: "Gross spend", value: formatCurrency(latest.summary.totalGross ?? 0, currency) },
                  { label: "VAT reclaimable", value: formatCurrency(latest.summary.totalVatClaimable ?? 0, currency) },
                  { label: "Exceptions", value: String(latest.summary.exceptions) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-[var(--color-muted-foreground)]">{label}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                <Link href={`/runs/${latest.id}/review`}><Button>Open review</Button></Link>
                <Link href={`/runs/${latest.id}/vat-summary`}><Button variant="secondary">VAT summary</Button></Link>
              </div>
            </Card>
          ) : (
            <Card className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">Current focus</p>
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
                { label: "Settings & VAT rules", href: "/settings" },
                { label: "Review templates", href: "/templates" },
              ].map(({ label, href }) => (
                <Link key={href} href={href} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--color-panel)]">
                  {label} <ArrowRight className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
