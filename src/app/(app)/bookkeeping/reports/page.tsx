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
  const repository = await getRepository();
  const [settingsSnapshot, runs, unassignedBankTxns] = await Promise.all([
    repository.getSettingsSnapshot(),
    repository.getRunsWithTransactions(),
    repository.getUnassignedBankTransactions().catch(() => []),
  ]);
  const categoryRuleMap = buildCategoryRuleMap(settingsSnapshot.categoryRules);

  const allTransactions: ClassifiedTransaction[] = [];

  for (const run of runs) {
    if (run.transactions.length === 0) continue;

    for (const transaction of run.transactions) {
      const resolvedCategoryName =
        transaction.category ?? resolveCategory(transaction, settingsSnapshot.categoryRules);
      const resolvedCategory = resolvedCategoryName
        ? categoryRuleMap.get(resolvedCategoryName)
        : undefined;

      allTransactions.push(
        classifyTransaction(transaction, resolvedCategory, settingsSnapshot.workspace.vatRegistered),
      );
    }
  }

  // Include bank statement transactions not yet attached to any run
  for (const tx of unassignedBankTxns) {
    const resolvedCategoryName = tx.category ?? resolveCategory(tx, settingsSnapshot.categoryRules);
    const resolvedCategory = resolvedCategoryName
      ? categoryRuleMap.get(resolvedCategoryName)
      : undefined;
    allTransactions.push(
      classifyTransaction(tx, resolvedCategory, settingsSnapshot.workspace.vatRegistered),
    );
  }

  const pnl = buildPnL(allTransactions, settingsSnapshot.workspace.defaultCurrency);
  const balanceSheet = buildBalanceSheet(allTransactions, settingsSnapshot.workspace.defaultCurrency);
  const vatReport = buildVatReport(
    allTransactions,
    settingsSnapshot.workspace.defaultCurrency,
    settingsSnapshot.workspace.vatRegistered,
  );
  const uncategorised = buildUncategorisedList(allTransactions);
  const isSoleTrader = settingsSnapshot.workspace.businessType === "sole_trader";

  return (
    <>
      <PageHeader
        eyebrow="Bookkeeping"
        title={isSoleTrader ? "Business summary" : "Financial reports"}
        description={
          isSoleTrader
            ? "Review profit, VAT position, and uncategorised transactions in a simpler sole-trader view without the full balance sheet screens."
            : "Review Profit & Loss, Balance Sheet, VAT position, and uncategorised transactions from the same transaction data the bookkeeping workflow uses."
        }
      />

      <FinancialReports
        pnl={pnl}
        balanceSheet={balanceSheet}
        vatReport={vatReport}
        uncategorised={uncategorised}
        currency={settingsSnapshot.workspace.defaultCurrency}
        businessType={settingsSnapshot.workspace.businessType}
      />
    </>
  );
}
