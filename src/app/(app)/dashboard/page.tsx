import Link from "next/link";
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

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Reconciliation control room"
        description="Track every run, see which ones need review, and jump directly into exceptions before export."
        actions={
          <Link href="/runs/new">
            <Button>Create reconciliation run</Button>
          </Link>
        }
      />

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          label="Runs this month"
          value={snapshot.runs.length}
          helper="Saved runs stay available for audit and repeat processing."
        />
        <StatCard
          label="Needs review"
          value={snapshot.runs.filter((run) => run.status === "review_required").length}
          helper="Rows with exceptions stay obvious instead of getting buried in exports."
        />
        <StatCard
          label="Templates saved"
          value={snapshot.templates.length}
          helper="Mapping templates keep recurring imports fast for finance teams."
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-0 overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-4 py-3">Run</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Matched</th>
                <th className="px-4 py-3">Exceptions</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {snapshot.runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-[var(--color-foreground)]">{run.name}</div>
                    <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Created {formatDate(run.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <RunStatusPill status={run.status} />
                  </td>
                  <td className="px-4 py-4">{run.summary.matched}</td>
                  <td className="px-4 py-4">{run.summary.exceptions}</td>
                  <td className="px-4 py-4 text-right">
                    <Link className="font-semibold text-[var(--color-accent)]" href={`/runs/${run.id}/review`}>
                      Open run
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              Current focus
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {latest?.name}
            </h2>
          </div>
          <dl className="grid gap-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-muted-foreground)]">Transactions</dt>
              <dd className="font-semibold">{latest?.summary.transactions || 0}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-muted-foreground)]">Probable matches</dt>
              <dd className="font-semibold">{latest?.summary.probable || 0}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-muted-foreground)]">Duplicates</dt>
              <dd className="font-semibold">{latest?.summary.duplicates || 0}</dd>
            </div>
          </dl>
          <div className="flex gap-3">
            <Link href={`/runs/${latest?.id}/exceptions`}>
              <Button variant="secondary">Open exceptions</Button>
            </Link>
            <Link href={`/runs/${latest?.id}/export`}>
              <Button>Export latest run</Button>
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}

