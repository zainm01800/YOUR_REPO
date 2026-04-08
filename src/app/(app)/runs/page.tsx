import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RunStatusPill } from "@/components/ui/status-pill";
import { getRepository } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function RunsPage() {
  const repository = getRepository();
  const snapshot = await repository.getDashboardSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Reconciliation"
        title="All runs"
        description="Every reconciliation run stays available for review, re-export, and use in the Posting File Builder."
        actions={
          <Link href="/runs/new">
            <Button>New run</Button>
          </Link>
        }
      />

      <Card className="overflow-hidden p-0">
        <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
          <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            <tr>
              <th className="px-6 py-4">Run name</th>
              <th className="px-6 py-4">Entity</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Transactions</th>
              <th className="px-6 py-4">Matched</th>
              <th className="px-6 py-4">Exceptions</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {snapshot.runs.map((run) => (
              <tr key={run.id} className="hover:bg-[var(--color-panel)] transition">
                <td className="px-6 py-5">
                  <div className="font-semibold text-[var(--color-foreground)]">{run.name}</div>
                </td>
                <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                  {run.entity ?? "—"}
                </td>
                <td className="px-6 py-5">
                  <RunStatusPill status={run.status} />
                </td>
                <td className="px-6 py-5">{run.summary.transactions}</td>
                <td className="px-6 py-5">{run.summary.matched}</td>
                <td className="px-6 py-5">
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
                <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                  {formatDate(run.createdAt)}
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/runs/${run.id}/review`}
                      className="font-semibold text-[var(--color-accent)]"
                    >
                      Review
                    </Link>
                    <Link
                      href={`/runs/${run.id}/export`}
                      className="font-semibold text-[var(--color-muted-foreground)]"
                    >
                      Export
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
