import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, Receipt, ShieldAlert } from "lucide-react";
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

const STATUS_SYMBOLS: Record<TransactionHealthTone, string> = {
  success: "OK",
  warning: "Check",
  danger: "Issue",
  muted: "Info",
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

  const highRiskRows = rows.filter((row) => row.health.tone === "danger").length;

  return (
    <>
      <PageHeader
        eyebrow={viewerAccess.isAccountantView ? "Accountant review" : "Records"}
        title="Review queue"
        description="Start here. Zentra only shows the transactions that need a human decision before your records are clean enough to export."
      />

      <div className="space-y-5">
        <div className="rounded-[28px] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-sm)]">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                Problems to review to fixed records to clean data
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--ink)]">
                {rows.length} item{rows.length !== 1 ? "s" : ""} need review
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Fix these before trusting tax estimates, VAT summaries, or accountant exports.
                Ready transactions stay out of the way.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[var(--panel-2)] p-4">
                <div className="flex items-center gap-2 text-[var(--color-danger)]">
                  <ShieldAlert className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Issues</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-[var(--ink)]">{highRiskRows}</p>
                <p className="text-xs text-[var(--muted)]">Duplicates or VAT risks</p>
              </div>
              <div className="rounded-2xl bg-[var(--panel-2)] p-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <Receipt className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Evidence</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-[var(--ink)]">
                  {issueCounts.get("missing_receipt") ?? 0}
                </p>
                <p className="text-xs text-[var(--muted)]">Receipts to attach or dismiss</p>
              </div>
            </div>
          </div>
        </div>

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
                Fix list
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Each row says what is wrong and the next action to take.
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
                    <th className="px-5 py-3">Suggested category</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Action required</th>
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
                        <details className="mt-2 md:hidden">
                          <summary className="cursor-pointer text-xs font-semibold text-[var(--accent-ink)]">
                            View checks
                          </summary>
                          <IssueList health={health} />
                        </details>
                      </td>
                      <td className="px-5 py-3 text-sm text-[var(--muted)]">
                        {health.resolvedCategory || "Uncategorised"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[health.tone]}`}>
                          {STATUS_SYMBOLS[health.tone]} - {health.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="max-w-xs text-xs font-medium leading-5 text-[var(--ink)]">
                          {health.detail}
                        </p>
                        <div className="mt-2 hidden md:block">
                          <IssueList health={health} compact />
                        </div>
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

function IssueList({
  health,
  compact = false,
}: {
  health: ReturnType<typeof getTransactionHealth>;
  compact?: boolean;
}) {
  if (health.issues.length === 0) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Ready
      </p>
    );
  }

  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "mt-2 space-y-1.5"}>
      {health.issues.slice(0, compact ? 3 : 6).map((issue) => (
        <span
          key={`${issue.code}-${issue.label}`}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASSES[issue.tone]}`}
          title={issue.detail}
        >
          {issue.tone === "danger" ? (
            <AlertTriangle className="h-3 w-3" />
          ) : issue.code === "missing_receipt" ? (
            <FileText className="h-3 w-3" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
          {issue.label}
        </span>
      ))}
    </div>
  );
}
