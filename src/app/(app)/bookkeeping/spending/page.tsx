import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { getCachedBookkeepingDataset } from "@/lib/data/cached-reads";
import type { TransactionRecord } from "@/lib/domain/types";
import { resolveCategory } from "@/lib/categories/suggester";
import { buildCategoryRuleMap, classifyTransaction } from "@/lib/accounting/classifier";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, BarChart3, Building2, FolderInput } from "lucide-react";

export const metadata = { title: "Supplier Analysis" };

interface SupplierRow {
  supplier: string;
  category: string;
  count: number;
  totalAmount: number;
  averagePerMonth: number;
}

interface CategorySpendRow {
  category: string;
  totalAmount: number;
  pct: number;
}

const DONUT_COLORS = [
  "#4c66ad",
  "#6f86c4",
  "#94a5d4",
  "#b8c3e2",
  "#cfaa68",
  "#7fa89a",
  "#d48d73",
  "#8f7fb0",
];

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function periodLabel(dates: string[]) {
  if (dates.length === 0) return "Current period";

  const sorted = [...dates].sort((a, b) => a.localeCompare(b));
  const start = new Date(sorted[0]);
  const end = new Date(sorted[sorted.length - 1]);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Current period";
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("en-GB", {
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  const endLabel = end.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });

  return `${startLabel} - ${endLabel}`;
}

export default async function SpendingPage() {
  const repository = await getRepository();
  const workspace = await repository.getWorkspace();
  const { settingsSnapshot, runs, unassignedBankTransactions: unassignedBankTxns } =
    await getCachedBookkeepingDataset(workspace.id);
  const categoryRuleMap = buildCategoryRuleMap(settingsSnapshot.categoryRules);
  const currency = settingsSnapshot.workspace.defaultCurrency ?? "GBP";

  const allTransactions: (TransactionRecord & { runId: string })[] = [];
  for (const run of runs) {
    for (const tx of run.transactions) {
      allTransactions.push({ ...tx, runId: run.id });
    }
  }
  for (const tx of unassignedBankTxns) {
    allTransactions.push({ ...tx, runId: tx.bankStatementId ?? tx.id });
  }

  const classifiedTransactions = allTransactions.map((tx) => {
    const resolvedCategoryName = tx.category || resolveCategory(tx, settingsSnapshot.categoryRules);
    const resolvedCategory = resolvedCategoryName
      ? categoryRuleMap.get(resolvedCategoryName)
      : undefined;
    return classifyTransaction(tx, resolvedCategory, settingsSnapshot.workspace.vatRegistered);
  });

  const expenseTransactions = classifiedTransactions.filter(
    (tx) => tx.accountType === "expense" && tx.statementType === "p_and_l",
  );
  const totalSpend = expenseTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0);
  const activeMonths = new Set(
    expenseTransactions
      .map((tx) => tx.date?.slice(0, 7))
      .filter((month): month is string => Boolean(month)),
  );
  const monthCount = Math.max(activeMonths.size, 1);

  const supplierMap = new Map<
    string,
    {
      count: number;
      totalAmount: number;
      categories: Map<string, number>;
    }
  >();
  const categoryMap = new Map<string, number>();

  for (const tx of expenseTransactions) {
    const supplier = tx.merchant || "Unknown supplier";
    const category = tx.category || tx.reportingBucket || "Uncategorised";

    if (!supplierMap.has(supplier)) {
      supplierMap.set(supplier, {
        count: 0,
        totalAmount: 0,
        categories: new Map(),
      });
    }

    const supplierEntry = supplierMap.get(supplier)!;
    supplierEntry.count += 1;
    supplierEntry.totalAmount += tx.grossAmount;
    supplierEntry.categories.set(
      category,
      (supplierEntry.categories.get(category) ?? 0) + tx.grossAmount,
    );
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + tx.grossAmount);
  }

  const supplierRows: SupplierRow[] = Array.from(supplierMap.entries())
    .map(([supplier, data]) => {
      const category =
        Array.from(data.categories.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "Uncategorised";
      return {
        supplier,
        category,
        count: data.count,
        totalAmount: data.totalAmount,
        averagePerMonth: data.totalAmount / monthCount,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const topSuppliers = supplierRows.slice(0, 8);
  const topSupplierMax = Math.max(...topSuppliers.map((row) => row.totalAmount), 1);
  const categoryRows: CategorySpendRow[] = Array.from(categoryMap.entries())
    .map(([category, totalAmount]) => ({
      category,
      totalAmount,
      pct: totalSpend > 0 ? (totalAmount / totalSpend) * 100 : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 8);

  const donutStops =
    categoryRows.length === 0
      ? "#e9e6dd 0deg 360deg"
      : categoryRows
          .reduce<{ stops: string[]; cursor: number }>(
            (acc, row, index) => {
              const degrees = Math.max(row.pct * 3.6, 3);
              const end = Math.min(acc.cursor + degrees, 360);
              acc.stops.push(
                `${DONUT_COLORS[index % DONUT_COLORS.length]} ${acc.cursor}deg ${end}deg`,
              );
              return { stops: acc.stops, cursor: end };
            },
            { stops: [], cursor: 0 },
          )
          .stops.join(", ");

  const dates = expenseTransactions
    .map((tx) => tx.date)
    .filter((date): date is string => Boolean(date));
  const currentPeriodLabel = periodLabel(dates);

  return (
    <>
      <PageHeader
        eyebrow="Review"
        title="Supplier Analysis"
        description="Who you paid most this period and where it went."
        actions={
          <select className="h-9 rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] shadow-[var(--shadow-sm)]">
            <option>{currentPeriodLabel}</option>
            <option>All periods</option>
          </select>
        }
      />

      {expenseTransactions.length === 0 ? (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr]">
          <div className="rounded-[26px] border border-[var(--line)] bg-white px-6 py-6 shadow-[var(--shadow-sm)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-2)]">
              Review workspace
            </p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-[var(--ink)]">
              Supplier insight appears once expense lines are classified
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              This page turns categorised expense transactions into supplier trends, top-spend
              rankings, and category concentration views.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/bank-statements"
                className="rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-sm)]"
              >
                Import bank statement
              </Link>
              <Link
                href="/bookkeeping/transactions"
                className="rounded-full bg-[#f4f2ed] px-3.5 py-1.5 text-xs font-semibold text-[var(--ink-2)]"
              >
                Categorise transactions
              </Link>
            </div>
          </div>
          <div className="rounded-[26px] border border-[var(--line)] bg-[linear-gradient(135deg,#faf8f2_0%,#f3ecde_100%)] px-6 py-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-2)]">
                  What this page will show
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">
                  Useful supplier patterns, not just another table
                </h3>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 text-[var(--accent-ink)]" />
            </div>
            <div className="mt-5 space-y-3">
              {[
                {
                  icon: Building2,
                  title: "Top suppliers by spend",
                  detail: "See who you paid most and how concentrated your spending is.",
                },
                {
                  icon: BarChart3,
                  title: "Category mix",
                  detail: "Spot whether costs are mostly travel, software, marketing, or something else.",
                },
                {
                  icon: FolderInput,
                  title: "Source-aware totals",
                  detail: "All figures come from the same bookkeeping layer used elsewhere in the app.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-[var(--accent-ink)]" />
                    <span className="text-sm font-semibold text-[var(--ink)]">{item.title}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: "Suppliers tracked",
                value: supplierRows.length.toString(),
                note: "Unique suppliers with P&L expense activity.",
              },
              {
                label: "Expense transactions",
                value: expenseTransactions.length.toString(),
                note: `${activeMonths.size || 1} month${activeMonths.size === 1 ? "" : "s"} contributing to this view.`,
              },
              {
                label: "Total spend",
                value: formatCurrency(totalSpend, currency),
                note: "Pulled from categorised expense lines only.",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-[var(--line)] bg-white px-5 py-4 shadow-[var(--shadow-sm)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-2)]">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                  {card.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{card.note}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
            <section className="cm-panel p-5">
              <p className="panel-eyebrow">Top suppliers by spend</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--ink)]">
                Top {topSuppliers.length} - YTD
              </h2>
              <div className="mt-5 space-y-4">
                {topSuppliers.map((row) => (
                  <div key={row.supplier}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-[var(--ink)]">
                        {row.supplier}
                        <span className="ml-1.5 font-normal text-[var(--muted)]">
                          - {row.category}
                        </span>
                      </p>
                      <p className="shrink-0 font-mono text-sm font-semibold text-[var(--ink)]">
                        {formatCurrency(row.totalAmount, currency)}
                      </p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#ece9e2]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{
                          width: `${Math.max((row.totalAmount / topSupplierMax) * 100, 3)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="cm-panel p-5">
              <p className="panel-eyebrow">Spend by category</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--ink)]">Breakdown</h2>
              <div className="mt-7 grid gap-7 md:grid-cols-[160px_1fr] md:items-center">
                <div
                  className="relative mx-auto h-36 w-36 rounded-full"
                  style={{ background: `conic-gradient(${donutStops})` }}
                >
                  <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white text-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Total
                    </span>
                    <span className="font-mono text-xl font-bold text-[var(--ink)]">
                      {formatCurrency(totalSpend, currency).replace(/\.00$/, "")}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {categoryRows.map((row, index) => (
                    <div key={row.category} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                          style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                        />
                        <span className="truncate text-[var(--ink-2)]">{row.category}</span>
                      </div>
                      <span className="font-mono font-semibold text-[var(--ink)]">
                        {formatCurrency(row.totalAmount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <section className="cm-table-wrap">
            <div className="border-b border-[var(--line)] px-5 py-4">
              <h2 className="text-lg font-semibold text-[var(--ink)]">Supplier breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="cm-table-head text-left">
                  <tr>
                    <th className="px-5 py-3">Supplier</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3 text-right">Transactions</th>
                    <th className="px-5 py-3 text-right">Total spent</th>
                    <th className="px-5 py-3 text-right">Avg / month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line-2)]">
                  {supplierRows.map((row) => (
                    <tr key={row.supplier} className="transition hover:bg-[#f8f6f0]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0eee8] text-xs font-semibold text-[var(--ink-2)]">
                            {initials(row.supplier)}
                          </span>
                          <span className="font-medium text-[var(--ink)]">{row.supplier}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-[#f0eee8] px-2.5 py-1 text-xs font-medium text-[var(--ink-2)]">
                          {row.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-[var(--ink)]">
                        {row.count}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-semibold text-[var(--ink)]">
                        {formatCurrency(row.totalAmount, currency)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-[var(--muted)]">
                        {formatCurrency(row.averagePerMonth, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
