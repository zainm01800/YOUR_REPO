import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { getCachedBookkeepingDataset } from "@/lib/data/cached-reads";
import { buildDuplicateCounts, getDuplicateKey, getTransactionHealth } from "@/lib/bookkeeping/transaction-health";
import { formatCurrency } from "@/lib/utils";
import type { TransactionRecord } from "@/lib/domain/types";

export const metadata = { title: "Missing Receipts" };

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function uniqueTransactions(transactions: TransactionRecord[]) {
  const seen = new Set<string>();
  const result: TransactionRecord[] = [];
  for (const tx of transactions) {
    if (seen.has(tx.id)) continue;
    seen.add(tx.id);
    result.push(tx);
  }
  return result;
}

export default async function MissingReceiptsPage() {
  const { workspace } = await getServerViewerAccess();
  const { settingsSnapshot, runs, unassignedBankTransactions } = await getCachedBookkeepingDataset(workspace.id);
  const allTransactions = uniqueTransactions([
    ...runs.flatMap((run) => run.transactions),
    ...unassignedBankTransactions,
  ]);
  const duplicateCounts = buildDuplicateCounts(allTransactions);
  const rows = allTransactions
    .map((tx) => {
      const health = getTransactionHealth(tx, settingsSnapshot.categoryRules, {
        vatRegistered: settingsSnapshot.workspace.vatRegistered,
        duplicateCount: duplicateCounts.get(getDuplicateKey(tx)) ?? 0,
      });
      return { tx, health };
    })
    .filter((row) => row.health.issues.some((issue) => issue.code === "missing_receipt"))
    .sort((a, b) => Math.abs(b.tx.amount) - Math.abs(a.tx.amount));

  const totalValue = rows.reduce((sum, row) => sum + Math.abs(row.tx.amount), 0);
  const largeItems = rows.filter((row) => Math.abs(row.tx.amount) >= 1000).length;

  return (
    <>
      <PageHeader
        eyebrow="Evidence"
        title="Missing receipts"
        description="Expense transactions that likely need a receipt or a no-receipt note before the records are accountant-ready."
      />

      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]">Receipts missing</p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums">{rows.length}</p>
            <p className="mt-1 text-sm text-amber-800">Attach evidence or mark no receipt required.</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Expense value</p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-[var(--ink)]">
              {formatCurrency(totalValue, settingsSnapshot.workspace.defaultCurrency)}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">Value of rows needing evidence.</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Large items</p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-[var(--ink)]">{largeItems}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Worth checking first.</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--line)] bg-white shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-3 border-b border-[var(--line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-[-0.03em] text-[var(--ink)]">Receipt evidence queue</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                This report is conservative: it flags higher-value expenses without matched run evidence or an explicit no-receipt note.
              </p>
            </div>
            <Link
              href="/bookkeeping/review-queue"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--color-panel)]"
            >
              Open review queue
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-base font-semibold text-[var(--ink)]">No missing receipts flagged</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Nothing obvious needs evidence based on the current transaction data.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--line)] text-sm">
                <thead>
                  <tr className="bg-[var(--color-panel)] text-left text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Transaction</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Why flagged</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {rows.map(({ tx, health }) => (
                    <tr key={tx.id} className="hover:bg-[var(--color-panel)]/60">
                      <td className="whitespace-nowrap px-5 py-3 text-[var(--muted)]">{formatDate(tx.transactionDate)}</td>
                      <td className="max-w-sm px-5 py-3">
                        <p className="truncate font-semibold text-[var(--ink)]">{tx.merchant || tx.description}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{tx.description}</p>
                      </td>
                      <td className="px-5 py-3 text-[var(--muted)]">{health.resolvedCategory || "Uncategorised"}</td>
                      <td className="px-5 py-3 text-xs text-[var(--muted)]">
                        Expense over evidence threshold with no matched receipt evidence.
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-[var(--ink)]">
                        {formatCurrency(Math.abs(tx.amount), tx.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
