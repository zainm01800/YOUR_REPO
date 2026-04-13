import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import type { StatementType, TransactionRecord } from "@/lib/domain/types";
import { resolveCategory } from "@/lib/categories/suggester";
import {
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_TYPE_LABELS,
  STATEMENT_TYPE_LABELS,
  buildCategoryRuleMap,
  classifyTransaction,
} from "@/lib/accounting/classifier";

interface SpendingRow {
  category: string;
  accountType: string;
  statementType: StatementType;
  reportingBucket: string;
  count: number;
  totalAmount: number;
  primaryCurrency: string;
  topMerchants: string[];
}

function fmtAmount(amount: number, currency: string) {
  const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };
  const sym = symbols[currency] ?? `${currency} `;
  return `${sym}${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function SpendingPage() {
  const repository = getRepository();
  const [snapshot, runs, unassignedBankTxns] = await Promise.all([
    repository.getDashboardSnapshot(),
    repository.getRunsWithTransactions(),
    repository.getUnassignedBankTransactions().catch(() => []),
  ]);
  const categoryRuleMap = buildCategoryRuleMap(snapshot.categoryRules);

  const allTransactions: (TransactionRecord & { runId: string })[] = [];
  for (const run of runs) {
    if (run.transactions.length === 0) continue;
    for (const tx of run.transactions) {
      allTransactions.push({ ...tx, runId: run.id });
    }
  }
  for (const tx of unassignedBankTxns) {
    allTransactions.push({ ...tx, runId: tx.bankStatementId ?? tx.id });
  }

  const classifiedTransactions = allTransactions.map((tx) => {
    const resolvedCategoryName = tx.category || resolveCategory(tx, snapshot.categoryRules);
    const resolvedCategory = resolvedCategoryName
      ? categoryRuleMap.get(resolvedCategoryName)
      : undefined;
    return classifyTransaction(tx, resolvedCategory, snapshot.workspace.vatRegistered);
  });

  const categoryMap = new Map<
    string,
    {
      accountType: string;
      statementType: StatementType;
      reportingBucket: string;
      count: number;
      totalAmount: number;
      currencies: Record<string, number>;
      merchants: Map<string, number>;
    }
  >();

  for (const tx of classifiedTransactions) {
    const category = tx.category || "Uncategorised";

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        accountType: tx.accountType,
        statementType: tx.statementType,
        reportingBucket: tx.reportingBucket,
        count: 0,
        totalAmount: 0,
        currencies: {},
        merchants: new Map(),
      });
    }

    const entry = categoryMap.get(category)!;
    entry.count += 1;
    entry.totalAmount += tx.grossAmount;
    entry.currencies[tx.currency] = (entry.currencies[tx.currency] ?? 0) + tx.grossAmount;
    entry.merchants.set(tx.merchant, (entry.merchants.get(tx.merchant) ?? 0) + tx.grossAmount);
  }

  const spendingRows: SpendingRow[] = Array.from(categoryMap.entries())
    .map(([category, data]) => {
      const primaryCurrency =
        Object.entries(data.currencies).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "GBP";
      const topMerchants = Array.from(data.merchants.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      return {
        category,
        accountType: data.accountType,
        statementType: data.statementType,
        reportingBucket: data.reportingBucket,
        count: data.count,
        totalAmount: data.totalAmount,
        primaryCurrency,
        topMerchants,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const totalSpend = classifiedTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0);
  const statementGroups: Array<{ key: StatementType; label: string; rows: SpendingRow[] }> = [
    {
      key: "p_and_l",
      label: "Profit & Loss",
      rows: spendingRows.filter((row) => row.statementType === "p_and_l"),
    },
    {
      key: "balance_sheet",
      label: "Balance Sheet",
      rows: spendingRows.filter((row) => row.statementType === "balance_sheet"),
    },
    {
      key: "equity_movement",
      label: "Equity movements",
      rows: spendingRows.filter((row) => row.statementType === "equity_movement"),
    },
    {
      key: "tax_control",
      label: "Tax control",
      rows: spendingRows.filter((row) => row.statementType === "tax_control"),
    },
  ];

  const monthlyMap = new Map<string, number>();
  for (const tx of classifiedTransactions) {
    if (!tx.date) continue;
    const month = tx.date.slice(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + tx.grossAmount);
  }
  const monthlyTrend = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);
  const maxMonthly = Math.max(...monthlyTrend.map(([, value]) => value), 1);

  return (
    <>
      <PageHeader
        eyebrow="Bookkeeping"
        title="Spending"
        description="See transaction activity grouped by the statement each category flows into, not just by label. This makes it much easier to separate P&L, Balance Sheet, and Equity movements."
      />

      {allTransactions.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-10 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No transactions yet.{" "}
            <Link href="/runs/new" className="text-[var(--color-accent)] hover:underline">
              Create a run
            </Link>{" "}
            and import a bank statement to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Total movement
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">
                {fmtAmount(totalSpend, snapshot.workspace.defaultCurrency)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Transactions
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">
                {allTransactions.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                P&amp;L categories
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">
                {statementGroups.find((group) => group.key === "p_and_l")?.rows.length ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Balance Sheet
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">
                {statementGroups.find((group) => group.key === "balance_sheet")?.rows.length ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Equity
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">
                {statementGroups.find((group) => group.key === "equity_movement")?.rows.length ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Uncategorized
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">
                {spendingRows.filter((row) => row.category === "Uncategorised").length}
              </p>
            </div>
          </div>

          {monthlyTrend.length > 1 && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-[var(--color-foreground)]">
                Monthly movement
              </h2>
              <div className="flex items-end gap-3">
                {monthlyTrend.map(([month, total]) => {
                  const pct = (total / maxMonthly) * 100;
                  const [year, mo] = month.split("-");
                  const label = new Date(Number(year), Number(mo) - 1).toLocaleDateString(
                    "en-GB",
                    { month: "short", year: "2-digit" },
                  );

                  return (
                    <div key={month} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-xs font-mono text-[var(--color-muted-foreground)]">
                        {fmtAmount(total, snapshot.workspace.defaultCurrency).replace(/\.00$/, "")}
                      </span>
                      <div className="relative w-full rounded-lg bg-[var(--color-panel)]" style={{ height: 80 }}>
                        <div
                          className="absolute bottom-0 left-0 w-full rounded-lg bg-[var(--color-accent)]"
                          style={{ height: `${pct}%`, opacity: 0.8 }}
                        />
                      </div>
                      <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {statementGroups
              .filter((group) => group.rows.length > 0)
              .map((group) => (
                <div key={group.key} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
                  <div className="border-b border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                        {STATEMENT_TYPE_LABELS[group.key] ?? group.label}
                      </h2>
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {group.rows.length} categor{group.rows.length === 1 ? "y" : "ies"}
                      </span>
                    </div>
                  </div>
                  <div>
                    {group.rows.map((row, index) => {
                      const pct = totalSpend > 0 ? (row.totalAmount / totalSpend) * 100 : 0;
                      return (
                        <div
                          key={`${group.key}-${row.category}`}
                          className={`flex items-center gap-4 px-5 py-4 ${index > 0 ? "border-t border-[var(--color-border)]" : ""}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  ACCOUNT_TYPE_COLORS[
                                    row.accountType as keyof typeof ACCOUNT_TYPE_COLORS
                                  ] ?? "bg-[var(--color-panel)] text-[var(--color-muted-foreground)]"
                                }`}
                              >
                                {ACCOUNT_TYPE_LABELS[
                                  row.accountType as keyof typeof ACCOUNT_TYPE_LABELS
                                ] ?? row.accountType}
                              </span>
                              <span className="font-medium text-[var(--color-foreground)]">
                                {row.category}
                              </span>
                              <span className="rounded-full bg-[var(--color-panel)] px-2 py-0.5 text-xs text-[var(--color-muted-foreground)]">
                                {row.count} txn{row.count !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                              {row.reportingBucket}
                            </p>
                            {row.topMerchants.length > 0 && (
                              <p className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]">
                                {row.topMerchants.join(", ")}
                              </p>
                            )}
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-panel)]">
                              <div
                                className="h-full rounded-full bg-[var(--color-accent)]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-mono font-semibold text-[var(--color-foreground)]">
                              {fmtAmount(row.totalAmount, row.primaryCurrency)}
                            </p>
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                              {pct.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>

          <p className="text-center text-xs text-[var(--color-muted-foreground)]">
            Categories are assigned on the{" "}
            <Link href="/bookkeeping/transactions" className="text-[var(--color-accent)] hover:underline">
              Transactions
            </Link>{" "}
            page and carry statement and tax metadata from{" "}
            <Link href="/settings" className="text-[var(--color-accent)] hover:underline">
              Category rules
            </Link>
            .
          </p>
        </div>
      )}
    </>
  );
}
