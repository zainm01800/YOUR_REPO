"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { DashboardSnapshot } from "@/lib/domain/types";

type RunListItem = DashboardSnapshot["runs"][number];

export function ExtractionsTable({ runs }: { runs: RunListItem[] }) {
  const [localRuns, setLocalRuns] = useState(runs);
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(run: RunListItem) {
    const confirmed = window.confirm(`Delete extraction job "${run.name}"?`);

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
          throw new Error("Could not delete that job.");
        }

        setLocalRuns((prev) => prev.filter((r) => r.id !== run.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete.");
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
            <th className="px-6 py-4">Job name</th>
            <th className="px-6 py-4">Created</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {localRuns.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="px-6 py-10 text-center text-sm text-[var(--color-muted-foreground)]"
              >
                No extraction jobs yet.
              </td>
            </tr>
          ) : (
            localRuns.map((run) => (
              <tr key={run.id} className="transition hover:bg-[var(--color-panel)]">
                <td className="px-6 py-5">
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {run.name}
                  </span>
                </td>
                <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                  {formatDate(run.createdAt)}
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/ocr-extraction/${run.id}`}
                      className="font-semibold text-[var(--color-accent)]"
                    >
                      Review
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
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}
