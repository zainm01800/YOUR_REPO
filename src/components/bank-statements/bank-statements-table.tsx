"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { BankStatementSummary } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

function statusLabel(status: BankStatementSummary["importStatus"]) {
  switch (status) {
    case "imported":
      return "Imported";
    case "importing":
      return "Importing";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function BankStatementsTable({
  statements,
}: {
  statements: BankStatementSummary[];
}) {
  const [localStatements, setLocalStatements] = useState(statements);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocalStatements(statements);
  }, [statements]);

  function handleDelete(statement: BankStatementSummary) {
    if (!window.confirm(`Delete "${statement.name}"?\n\nThis will permanently remove the statement and its transactions.`)) return;
    startTransition(async () => {
      setDeletingId(statement.id);
      setDeleteError(null);
      try {
        const res = await fetch(`/api/bank-statements/${statement.id}`, { method: "DELETE" });
        if (!res.ok) {
          const payload = await res.json().catch(() => null) as { error?: string } | null;
          throw new Error(payload?.error ?? "Could not delete statement.");
        }
        setLocalStatements((prev) => prev.filter((candidate) => candidate.id !== statement.id));
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Could not delete statement.");
      } finally {
        setDeletingId(null);
      }
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return localStatements;
    }

    return localStatements.filter((statement) =>
      [statement.name, statement.fileName, statement.bankName, statement.accountName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [query, localStatements]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search statements..."
          className="min-w-[220px] flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
        />
        <Link href="/bank-statements/import">
          <Button>Import statement</Button>
        </Link>
      </div>

      {deleteError && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{deleteError}</p>
      )}

      <Card className="overflow-hidden p-0">
        <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
          <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            <tr>
              <th className="px-6 py-4">Statement</th>
              <th className="px-6 py-4">Bank / account</th>
              <th className="px-6 py-4">Range</th>
              <th className="px-6 py-4">Transactions</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Imported</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-[var(--color-muted-foreground)]">
                  No bank statements found yet.
                </td>
              </tr>
            ) : (
              filtered.map((statement) => (
                <tr key={statement.id} className="transition hover:bg-[var(--color-panel)]">
                  <td className="px-6 py-5">
                    <div className="font-semibold text-[var(--color-foreground)]">{statement.name}</div>
                    <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{statement.fileName}</div>
                  </td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    {[statement.bankName, statement.accountName].filter(Boolean).join(" · ") || "Unknown source"}
                  </td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    {statement.dateRangeStart && statement.dateRangeEnd
                      ? `${statement.dateRangeStart} → ${statement.dateRangeEnd}`
                      : "Date range unavailable"}
                  </td>
                  <td className="px-6 py-5 tabular-nums">{statement.transactionCount}</td>
                  <td className="px-6 py-5">{statusLabel(statement.importStatus)}</td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">{formatDate(statement.importedAt)}</td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link href={`/bank-statements/${statement.id}`} className="font-semibold text-[var(--color-accent)]">
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(statement)}
                        disabled={isPending}
                        className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-40"
                      >
                        {deletingId === statement.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
