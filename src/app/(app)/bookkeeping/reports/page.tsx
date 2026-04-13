import { PageHeader } from "@/components/app-shell/page-header";
import { FinancialReports } from "@/components/bookkeeping/financial-reports";
import type { ClassifiedTransaction } from "@/lib/accounting/classifier";
import { getRepository } from "@/lib/data";
import { classifyTransaction, buildCategoryRuleMap } from "@/lib/accounting/classifier";
import {
  buildBalanceSheet,
  buildPnL,
  buildUncategorisedList,
  buildVatReport,
} from "@/lib/accounting/reports";
import { resolveCategory } from "@/lib/categories/suggester";

export default async function BookkeepingReportsPage() {
  const repository = getRepository();
  const [snapshot, runs] = await Promise.all([
    repository.getDashboardSnapshot(),
    repository.getRunsWithTransactions(),
  ]);
  const categoryRuleMap = buildCategoryRuleMap(snapshot.categoryRules);

  const allTransactions: ClassifiedTransaction[] = [];

  for (const run of runs) {
    if (run.transactions.length === 0) continue;

    for (const transaction of run.transactions) {
      const resolvedCategoryName =
        transaction.category ?? resolveCategory(transaction, snapshot.categoryRules);
      const resolvedCategory = resolvedCategoryName
        ? categoryRuleMap.get(resolvedCategoryName)
        : undefined;

      allTransactions.push(
        classifyTransaction(transaction, resolvedCategory, snapshot.workspace.vatRegistered),
      );
    }
  }

  const pnl = buildPnL(allTransactions, snapshot.workspace.defaultCurrency);
  const balanceSheet = buildBalanceSheet(allTransactions, snapshot.workspace.defaultCurrency);
  const vatReport = buildVatReport(
    allTransactions,
    snapshot.workspace.defaultCurrency,
    snapshot.workspace.vatRegistered,
  );
  const uncategorised = buildUncategorisedList(allTransactions);

  return (
    <>
      <PageHeader
        eyebrow="Bookkeeping"
        title="Financial reports"
        description="Review Profit & Loss, Balance Sheet, VAT position, and uncategorised transactions from the same transaction data the bookkeeping workflow uses."
      />

      <FinancialReports
        pnl={pnl}
        balanceSheet={balanceSheet}
        vatReport={vatReport}
        uncategorised={uncategorised}
        currency={snapshot.workspace.defaultCurrency}
      />
    </>
  );
}
