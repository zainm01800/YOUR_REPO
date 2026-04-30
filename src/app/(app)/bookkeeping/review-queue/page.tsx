import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { getCachedBookkeepingDataset } from "@/lib/data/cached-reads";
import {
  buildDuplicateCounts,
  getDuplicateKey,
  getTransactionHealth,
  type TransactionIssueCode,
  type TransactionHealthTone,
} from "@/lib/bookkeeping/transaction-health";
import { formatCurrency } from "@/lib/utils";
import type { TransactionRecord } from "@/lib/domain/types";

export const metadata = { title: "Review Queue" };

const TONE_CLASSES: Record<TransactionHealthTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  muted: "border-[var(--line)] bg-[var(--color-panel)] text-[var(--muted)]",
};

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

export default async function ReviewQueuePage() {
  const { workspace, viewerAccess } = await getServerViewerAccess();
  const { settingsSnapshot, runs, unassignedBankTransactions } = await getCachedBookkeepingDataset(workspace.id);
  const allTransactions = uniqueTransactions([
    ...runs.flatMap((run) =>
      run.transactions.map((tx) => ({
        ...tx,
        runId: tx.runId ?? run.id,
        runName: tx.runName ?? run.name,
      })),
    ),
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
    .filter((row) => row.health.status === "needs_review")
    .sort((a, b) => {
      const aDate = a.tx.transactionDate ?? "";
      const bDate = b.tx.transactionDate ?? "";
      return bDate.localeCompare(aDate);
    });

  const issueCounts = new Map<TransactionIssueCode, number>();
  for (const row of rows) {
    for (const issue of row.health.issues) {
      issueCounts.set(issue.code, (issueCounts.get(issue.code) ?? 0) + 1);
    }
  }

  const summaryCards = [
    {
      label: "Needs category",
      value: issueCounts.get("needs_category") ?? 0,
      detail: "Unclear or uncategorised transactions.",
      tone: "warning" as const,
    },
    {
      label: "Missing receipt",
      value: issueCounts.get("missing_receipt") ?? 0,
      detail: "Expense evidence to request or mark as not required.",
      tone: "warning" as const,
    },
    {
      label: "VAT checks",
      value: issueCounts.get("vat_review") ?? 0,
      detail: "VAT-relevant items needing a code.",
      tone: "warning" as const,
    },
    {
      label: "Possible duplicates",
      value: issueCounts.get("duplicate_possible") ?? 0,
      detail: "Same date, amount, and merchant text.",
      tone: "danger" as const,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={viewerAccess.isAccountantView ? "Accountant review" : "Records"}
        title="Review queue"
        description="A focused list of transactions that need a category, receipt, VAT check, or duplicate review before reports and exports are trusted."
      />

      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className={`rounded-2xl border p-4 ${TONE_CLASSES[card.tone]}`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-80">{card.label}</p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums">{card.value}</p>
              <p className="mt-1 text-xs leading-5 opacity-85">{card.detail}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[24px] border border-[var(--line)] bg-white shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-3 border-b border-[var(--line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-[-0.03em] text-[var(--ink)]">
                Items to clear
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Clear these first to make the dashboard, tax summary, and export pack more reliable.
              </p>
            </div>
            <Link
              href="/bookkeeping/transactions"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--color-panel)]"
            >
              Open transactions
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-base font-semibold text-[var(--ink)]">Nothing urgent to review</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Imported transactions currently have enough category and tax information for basic reporting.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--line)] text-sm">
                <thead>
                  <tr className="bg-[var(--color-panel)] text-left text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Transaction</th>
                    <th className="px-5 py-3">Main issue</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {rows.slice(0, 100).map(({ tx, health }) => (
                    <tr key={tx.id} className="hover:bg-[var(--color-panel)]/60">
                      <td className="whitespace-nowrap px-5 py-3 text-[var(--muted)]">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td className="max-w-sm px-5 py-3">
                        <p className="truncate font-semibold text-[var(--ink)]">
                          {tx.merchant || tx.description || "Unknown transaction"}
                        </p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {tx.description}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[health.tone]}`}>
                          {health.label}
                        </span>
                        <p className="mt-1 max-w-xs text-xs text-[var(--muted)]">
                          {health.detail}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-sm text-[var(--muted)]">
                        {health.resolvedCategory || "Uncategorised"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-[var(--ink)]">
                        {formatCurrency(tx.amount, tx.currency)}
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
