import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { buildCategoryRuleMap, classifyTransaction } from "@/lib/accounting/classifier";
import { resolveCategory } from "@/lib/categories/suggester";
import { TransactionsTable } from "@/components/bookkeeping/transactions-table";

export default async function BookkeepingTransactionsPage() {
  const repository = getRepository();
  const [settingsSnapshot, runsResult, unassignedBankTransactionsResult] = await Promise.all([
    repository.getSettingsSnapshot(),
    repository.getRunsWithTransactions().catch((error) => {
      console.error("[bookkeeping/transactions] failed to load runs with transactions:", error);
      return [];
    }),
    repository.getUnassignedBankTransactions().catch((error) => {
      console.error("[bookkeeping/transactions] failed to load unassigned bank transactions:", error);
      return [];
    }),
  ]);
  const runs = runsResult;
  const unassignedBankTransactions = unassignedBankTransactionsResult;
  const categoryRuleMap = buildCategoryRuleMap(settingsSnapshot.categoryRules);

  // Gather all transactions across all completed/reviewed runs
  const allTransactions: {
    id: string;
    sourceBankTransactionId?: string;
    externalId?: string;
    sourceLineNumber?: number;
    transactionDate?: string;
    postedDate?: string;
    amount: number;
    currency: string;
    merchant: string;
    description: string;
    employee?: string;
    reference?: string;
    costCentre?: string;
    department?: string;
    vatCode?: string;
    glCode?: string;
    category?: string;
    noReceiptRequired?: boolean;
    excludedFromExport?: boolean;
    runName: string;
    runId: string;
    period?: string;
  }[] = [];

  // Collect all run transactions
  for (const run of runs) {
    if (run.transactions.length === 0) continue;
    for (const tx of run.transactions) {
      allTransactions.push({
        ...tx,
        runName: run.name,
        runId: run.id,
        period: run.period,
      });
    }
  }

  // Also include centrally stored bank transactions not yet pulled into a run
  for (const transaction of unassignedBankTransactions) {
    allTransactions.push({
      ...transaction,
      runName: transaction.bankStatementName || "Imported bank statement",
      runId: transaction.bankStatementId || transaction.id,
    });
  }

  // Sort by date descending
  allTransactions.sort((a, b) => {
    const da = a.transactionDate ?? "";
    const db = b.transactionDate ?? "";
    return db.localeCompare(da);
  });

  // Derive the set of all known categories (from rules + manual assignments)
  const allCategories = Array.from(
    new Set([
      ...settingsSnapshot.categoryRules.map((r) => r.category),
      ...allTransactions
        .map((tx) => tx.category ?? resolveCategory(tx, settingsSnapshot.categoryRules) ?? "")
        .filter(Boolean),
    ]),
  ).sort();

  const totalCount = allTransactions.length;
  const categorisedCount = allTransactions.filter(
    (tx) => tx.category || resolveCategory(tx, settingsSnapshot.categoryRules),
  ).length;
  const classifiedTransactions = allTransactions.map((tx) => {
    const resolvedCategoryName = tx.category ?? resolveCategory(tx, settingsSnapshot.categoryRules);
    const resolvedCategory = resolvedCategoryName
      ? categoryRuleMap.get(resolvedCategoryName)
      : undefined;
    return classifyTransaction(tx, resolvedCategory, settingsSnapshot.workspace.vatRegistered);
  });
  const statementCounts = {
    pnl: classifiedTransactions.filter((tx) => tx.statementType === "p_and_l").length,
    balanceSheet: classifiedTransactions.filter((tx) => tx.statementType === "balance_sheet").length,
    equity: classifiedTransactions.filter((tx) => tx.statementType === "equity_movement").length,
  };

  return (
    <>
      <PageHeader
        eyebrow="Bookkeeping"
        title="Transactions"
        description="All imported transactions across every run. Assign categories to build a clear picture of spending."
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Total transactions</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Categorised</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{categorisedCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Uncategorised</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">{totalCount - categorisedCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Categories</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">{allCategories.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">P&amp;L items</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">{statementCounts.pnl}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Balance Sheet</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">{statementCounts.balanceSheet}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Equity items</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">{statementCounts.equity}</p>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-10 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No transactions yet. Create a run and import a bank or card statement to get started.
          </p>
        </div>
      ) : (
        <TransactionsTable
          transactions={allTransactions}
          categoryRules={settingsSnapshot.categoryRules}
          allCategories={allCategories}
          vatRegistered={settingsSnapshot.workspace.vatRegistered}
        />
      )}
    </>
  );
}
