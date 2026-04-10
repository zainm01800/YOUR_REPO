"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RunStatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/utils";
import type { DashboardSnapshot } from "@/lib/domain/types";

type RunListItem = DashboardSnapshot["runs"][number];

export function RunsTable({ runs }: { runs: RunListItem[] }) {
  const router = useRouter();
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(run: RunListItem) {
    const confirmed = window.confirm(
      `Delete "${run.name}"?\n\nThis will remove the run and its review state from the workspace.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setPendingRunId(run.id);
      setError(null);

      try {
        const response = await fetch(`/api/runs/${run.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Could not delete that run.");
        }

        router.refresh();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error ? deleteError.message : "Could not delete that run.",
        );
      } finally {
        setPendingRunId(null);
      }
    });
  }

  return (
    <Card className="overflow-hidden p-0">
      {error ? (
        <div className="border-b border-[var(--color-border)] bg-rose-50 px-6 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
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
          {runs.map((run) => (
            <tr key={run.id} className="transition hover:bg-[var(--color-panel)]">
              <td className="px-6 py-5">
                <div className="font-semibold text-[var(--color-foreground)]">{run.name}</div>
              </td>
              <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                {run.entity ?? "-"}
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
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 px-3 text-rose-700 hover:text-rose-800"
                    disabled={pendingRunId === run.id}
                    onClick={() => handleDelete(run)}
                  >
                    {pendingRunId === run.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
