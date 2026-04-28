"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, FileStack, Landmark, Search } from "lucide-react";
import type { BankStatementSummary } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

type BankStatementTab = "overview" | "statements";

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

function statusTone(status: BankStatementSummary["importStatus"]) {
  switch (status) {
    case "imported":
      return "bg-emerald-50 text-emerald-700";
    case "importing":
      return "bg-amber-50 text-amber-700";
    case "failed":
      return "bg-[var(--danger-soft)] text-[var(--danger)]";
    default:
      return "bg-[var(--color-panel)] text-[var(--muted)]";
  }
}

export function BankStatementsTable({
  statements,
  canManageOperationalData = true,
}: {
  statements: BankStatementSummary[];
  canManageOperationalData?: boolean;
}) {
  const [tab, setTab] = useState<BankStatementTab>("overview");
  const [localStatements, setLocalStatements] = useState(statements);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    setLocalStatements(statements);
  }, [statements]);

  function handleDeleteClick(statement: BankStatementSummary) {
    setConfirmDeleteId(statement.id);
  }

  function handleDeleteConfirm(statement: BankStatementSummary) {
    setConfirmDeleteId(null);
    startTransition(async () => {
      setDeletingId(statement.id);
      setDeleteError(null);
      try {
        const response = await fetch(`/api/bank-statements/${statement.id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? "Could not delete statement.");
        }
        setLocalStatements((previous) =>
          previous.filter((candidate) => candidate.id !== statement.id),
        );
        toast({ variant: "success", title: `"${statement.name}" deleted` });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not delete statement.";
        setDeleteError(message);
        toast({ variant: "error", title: "Delete failed", description: message });
      } finally {
        setDeletingId(null);
      }
    });
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return localStatements;

    return localStatements.filter((statement) =>
      [statement.name, statement.fileName, statement.bankName, statement.accountName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [localStatements, query]);

  const totalTransactions = localStatements.reduce(
    (sum, statement) => sum + statement.transactionCount,
    0,
  );
  const importedCount = localStatements.filter(
    (statement) => statement.importStatus === "imported",
  ).length;
  const importingCount = localStatements.filter(
    (statement) => statement.importStatus === "importing",
  ).length;
  const failedCount = localStatements.filter(
    (statement) => statement.importStatus === "failed",
  ).length;

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as BankStatementTab)} className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TabsList className="w-full overflow-x-auto whitespace-nowrap lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="statements">
            Statements
            <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
              {filtered.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {canManageOperationalData ? (
          <Link href="/bank-statements/import">
            <Button>Import statement</Button>
          </Link>
        ) : (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--color-panel)] px-3 py-2 text-sm text-[var(--muted)]">
            Read-only access
          </div>
        )}
      </div>

      <TabsContent value="overview" className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Statements stored",
              value: localStatements.length.toString(),
              note: "Reusable bank or card sources already imported into the workspace.",
            },
            {
              label: "Transactions imported",
              value: totalTransactions.toString(),
              note: "Statement lines available for categorisation and matching.",
            },
            {
              label: "Ready to use",
              value: importedCount.toString(),
              note: "Statements fully imported and available to reuse across runs.",
            },
            {
              label: "Attention needed",
              value: (importingCount + failedCount).toString(),
              note: "Statements still importing or needing another look.",
            },
          ].map((item) => (
            <Card key={item.label} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                {item.label}
              </p>
              <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                {item.value}
              </p>
              <p className="text-sm text-[var(--muted)]">{item.note}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                Central transaction source
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">
                Upload once, reuse across workflows
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Statements live here so users do not need to re-upload the same source file for
                every reconciliation run.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-[var(--color-panel)] px-4 py-4">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-[var(--accent-ink)]" />
                  <p className="text-sm font-semibold text-[var(--ink)]">What users do here</p>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                  <li>Import bank or card statements.</li>
                  <li>Review parsed transaction counts and date ranges.</li>
                  <li>Open a statement detail page for source-specific checking.</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-[var(--color-panel)] px-4 py-4">
                <div className="flex items-center gap-2">
                  <FileStack className="h-4 w-4 text-[var(--accent-ink)]" />
                  <p className="text-sm font-semibold text-[var(--ink)]">What happens next</p>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                  <li>Transactions flow into the review and expenses workflows.</li>
                  <li>Reconciliation runs can match receipts against this imported data.</li>
                  <li>Reports and tax summaries reuse the same bookkeeping layer.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="space-y-4 bg-[linear-gradient(135deg,#faf8f2_0%,#f3ecde_100%)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-2 text-[var(--accent-ink)] shadow-[var(--shadow-sm)]">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--ink)]">Next best actions</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Keep the banking flow easy for non-accountants by making the next step obvious.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-[var(--ink-2)]">
                Import a new statement when a month or account is still missing.
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-[var(--ink-2)]">
                Open statement details if a transaction count looks wrong.
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-[var(--ink-2)]">
                Move to Transactions or Reconciliation once the source data is in.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/bookkeeping/transactions"
                className="rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-sm)]"
              >
                Review transactions
              </Link>
              <Link
                href="/runs"
                className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--ink)]"
              >
                Open runs
              </Link>
            </div>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="statements" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search statements..."
              className="w-full rounded-xl border border-[var(--line)] bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="text-sm text-[var(--muted)] lg:ml-auto">
            {filtered.length} of {localStatements.length} statement
            {localStatements.length === 1 ? "" : "s"}
          </div>
        </div>

        {deleteError ? (
          <p className="rounded-xl bg-[var(--danger-soft)] px-4 py-2 text-sm text-[var(--danger)]">
            {deleteError}
          </p>
        ) : null}

        {filtered.length === 0 ? (
          <Card className="px-6 py-12 text-center text-sm text-[var(--muted)]">
            No bank statements found yet.
          </Card>
        ) : (
          <>
            <div className="grid gap-3 lg:hidden">
              {filtered.map((statement) => (
                <Card
                  key={statement.id}
                  className={`space-y-4 ${
                    confirmDeleteId === statement.id ? "border-rose-300 bg-rose-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[var(--ink)]">
                        {statement.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--muted)]">
                        {statement.fileName}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(
                        statement.importStatus,
                      )}`}
                    >
                      {statusLabel(statement.importStatus)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                        Source
                      </p>
                      <p className="mt-1 text-[var(--ink-2)]">
                        {[statement.bankName, statement.accountName]
                          .filter(Boolean)
                          .join(" · ") || "Unknown source"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                        Transactions
                      </p>
                      <p className="mt-1 font-mono font-semibold text-[var(--ink)]">
                        {statement.transactionCount}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                        Date range
                      </p>
                      <p className="mt-1 text-[var(--ink-2)]">
                        {statement.dateRangeStart && statement.dateRangeEnd
                          ? `${statement.dateRangeStart} → ${statement.dateRangeEnd}`
                          : "Date range unavailable"}
                      </p>
                    </div>
                  </div>

                  {confirmDeleteId === statement.id ? (
                    <div className="rounded-2xl bg-rose-100 px-3 py-3 text-sm text-rose-700">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="space-y-3">
                          <p>Permanently delete this statement and all its transactions?</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                              onClick={() => handleDeleteConfirm(statement)}
                            >
                              Yes, delete
                            </button>
                            <button
                              className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/bank-statements/${statement.id}`}
                      className="rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-sm)]"
                    >
                      View statement
                    </Link>
                    {canManageOperationalData ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(statement)}
                        disabled={isPending}
                        className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--danger)]"
                      >
                        {deletingId === statement.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>

            <Card className="hidden overflow-hidden p-0 lg:block">
              <div className="table-scroll">
                <table className="min-w-full divide-y divide-[var(--line)] text-sm">
                  <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    <tr>
                      <th className="px-6 py-4">Statement</th>
                      <th className="px-6 py-4">Bank / account</th>
                      <th className="px-6 py-4">Range</th>
                      <th className="px-6 py-4">Transactions</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Imported</th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {filtered.map((statement) => (
                      <tr
                        key={statement.id}
                        className={`transition ${
                          confirmDeleteId === statement.id
                            ? "bg-rose-50"
                            : "hover:bg-[var(--color-panel)]"
                        }`}
                      >
                        <td className="px-6 py-5">
                          <div className="font-semibold text-[var(--ink)]">{statement.name}</div>
                          <div className="mt-1 text-xs text-[var(--muted)]">
                            {statement.fileName}
                          </div>
                          {confirmDeleteId === statement.id ? (
                            <div className="mt-2 flex items-center gap-2 rounded-xl bg-rose-100 px-3 py-2 text-xs text-rose-700">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                Permanently delete this statement and all its transactions?
                              </span>
                              <button
                                className="ml-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                                onClick={() => handleDeleteConfirm(statement)}
                              >
                                Yes, delete
                              </button>
                              <button
                                className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-semibold hover:bg-rose-50"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-6 py-5 text-[var(--muted)]">
                          {[statement.bankName, statement.accountName]
                            .filter(Boolean)
                            .join(" · ") || "Unknown source"}
                        </td>
                        <td className="px-6 py-5 text-[var(--muted)]">
                          {statement.dateRangeStart && statement.dateRangeEnd
                            ? `${statement.dateRangeStart} → ${statement.dateRangeEnd}`
                            : "Date range unavailable"}
                        </td>
                        <td className="px-6 py-5 font-mono tabular-nums">
                          {statement.transactionCount}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(
                              statement.importStatus,
                            )}`}
                          >
                            {statusLabel(statement.importStatus)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-[var(--muted)]">
                          {formatDate(statement.importedAt)}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <Link
                              href={`/bank-statements/${statement.id}`}
                              className="font-semibold text-[var(--accent)]"
                            >
                              View
                            </Link>
                            {canManageOperationalData ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(statement)}
                                disabled={isPending || confirmDeleteId === statement.id}
                                className="text-sm font-medium text-[var(--danger)] hover:opacity-80 disabled:opacity-40"
                              >
                                {deletingId === statement.id ? "Deleting..." : "Delete"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
