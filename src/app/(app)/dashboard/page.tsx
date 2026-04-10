import Link from "next/link";
import { ArrowRight, FileSpreadsheet, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/app-shell/stat-card";
import { RunStatusPill } from "@/components/ui/status-pill";
import { getRepository } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const repository = getRepository();
  const snapshot = await repository.getDashboardSnapshot();
  const latest = snapshot.runs[0];

  const needsReview = snapshot.runs.filter((r) => r.status === "review_required").length;
  const totalExceptions = snapshot.runs.reduce((sum, r) => sum + r.summary.exceptions, 0);
  const hasRuns = snapshot.runs.length > 0;

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

      {/* Onboarding banner — shown only when there are no runs */}
      {!hasRuns && (
        <Card className="flex flex-col gap-5 border-[var(--color-accent)] bg-[var(--color-accent-soft)] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                Welcome to ClearMatch! Let&apos;s run your first reconciliation.
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Upload a transaction export and a batch of receipts to get started. It takes less than a minute.
              </p>
              <ol className="mt-3 space-y-1 text-sm text-[var(--color-muted-foreground)]">
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-white">1</span>
                  Create a new reconciliation run
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-white">2</span>
                  Upload your CSV/Excel transaction file and receipts
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-white">3</span>
                  Review matches, fix exceptions, and export
                </li>
              </ol>
            </div>
          </div>
          <Link href="/runs/new" className="shrink-0">
            <Button className="gap-2">
              Start first run
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-4">
        <StatCard
          label="Total runs"
          value={snapshot.runs.length}
          helper="All saved runs available for re-export."
        />
        <StatCard
          label="Needs review"
          value={needsReview}
          helper="Runs with open exceptions."
        />
        <StatCard
          label="Open exceptions"
          value={totalExceptions}
          helper="Rows needing finance attention."
        />
        <StatCard
          label="Saved templates"
          value={snapshot.templates.length}
          helper="Column mapping templates for recurring imports."
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            Recent runs
          </div>

          {hasRuns ? (
            <>
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  <tr>
                    <th className="px-6 py-4">Run</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Matched</th>
                    <th className="px-6 py-4">Exceptions</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {snapshot.runs.map((run) => (
                    <tr key={run.id} className="hover:bg-[var(--color-panel)] transition">
                      <td className="px-6 py-5">
                        <div className="font-semibold text-[var(--color-foreground)]">{run.name}</div>
                        <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                          {formatDate(run.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <RunStatusPill status={run.status} />
                      </td>
                      <td className="px-6 py-5">{run.summary.matched}</td>
                      <td className="px-6 py-5">
                        {run.summary.exceptions > 0 ? (
                          <Link href={`/runs/${run.id}/exceptions`} className="font-semibold text-[var(--color-danger)]">
                            {run.summary.exceptions}
                          </Link>
                        ) : (
                          <span className="text-[var(--color-muted-foreground)]">0</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <Link href={`/runs/${run.id}/review`} className="font-semibold text-[var(--color-accent)]">
                            Review
                          </Link>
                          <Link href={`/runs/${run.id}/export`} className="text-[var(--color-muted-foreground)]">
                            Export
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-[var(--color-border)] px-6 py-3">
                <Link href="/runs" className="text-sm font-semibold text-[var(--color-accent)]">
                  View all runs →
                </Link>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--color-panel)]">
                <PlusCircle className="h-6 w-6 text-[var(--color-muted-foreground)]" />
              </div>
              <div>
                <p className="font-semibold text-[var(--color-foreground)]">No runs yet</p>
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
            <Card className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                  Current focus
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight">
                  {latest.name}
                </h2>
              </div>
              <dl className="grid gap-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-muted-foreground)]">Transactions</dt>
                  <dd className="font-semibold">{latest.summary.transactions}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-muted-foreground)]">Matched</dt>
                  <dd className="font-semibold">{latest.summary.matched}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-muted-foreground)]">Exceptions</dt>
                  <dd className={`font-semibold ${latest.summary.exceptions > 0 ? "text-[var(--color-danger)]" : ""}`}>
                    {latest.summary.exceptions}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-3">
                <Link href={`/runs/${latest.id}/review`}>
                  <Button>Open review</Button>
                </Link>
                <Link href={`/runs/${latest.id}/export`}>
                  <Button variant="secondary">Export</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                Current focus
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No runs yet. Create one to see your current focus here.
              </p>
            </Card>
          )}

          <Card className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Posting File Builder</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                Transform approved reconciliation data into ERP-ready posting files.
              </p>
            </div>
            <Link href="/posting-file-builder">
              <Button variant="secondary" className="w-full">
                Open Posting File Builder →
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
