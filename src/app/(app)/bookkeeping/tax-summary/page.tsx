import { PageHeader } from "@/components/app-shell/page-header";
import { TaxSummary } from "@/components/bookkeeping/tax-summary";
import {
  buildCategoryRuleMap,
  classifyTransaction,
  type ClassifiedTransaction,
} from "@/lib/accounting/classifier";
import { buildPnL, buildVatReport } from "@/lib/accounting/reports";
import { buildTaxSummaryReport } from "@/lib/accounting/tax-summary";
import { resolveCategory } from "@/lib/categories/suggester";
import { getRepository } from "@/lib/data";

export default async function BookkeepingTaxSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const selectedPeriod = params.period;

  const repository = await getRepository();
  const [settingsSnapshot, runs, unassignedBankTxns] = await Promise.all([
    repository.getSettingsSnapshot(),
    repository.getRunsWithTransactions(),
    repository.getUnassignedBankTransactions().catch(() => []),
  ]);
  const categoryRuleMap = buildCategoryRuleMap(settingsSnapshot.categoryRules);
  const periodOptions = Array.from(
    new Set(runs.map((run) => run.period).filter((period): period is string => Boolean(period))),
  ).sort((a, b) => b.localeCompare(a));

  const allTransactions: ClassifiedTransaction[] = [];

  for (const run of runs) {
    if (selectedPeriod && run.period !== selectedPeriod) {
      continue;
    }
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
  const vatReport = buildVatReport(
    allTransactions,
    settingsSnapshot.workspace.defaultCurrency,
    settingsSnapshot.workspace.vatRegistered,
  );
  const taxSummary = buildTaxSummaryReport({
    pnl,
    vatReport,
    businessType: settingsSnapshot.workspace.businessType,
    currency: settingsSnapshot.workspace.defaultCurrency,
    classifiedTransactions: allTransactions,
  });
  const isSoleTrader = settingsSnapshot.workspace.businessType === "sole_trader";

  return (
    <>
      <PageHeader
        eyebrow="Bookkeeping"
        title="Tax summary"
        description={
          isSoleTrader
            ? "Practical profit, VAT, and owner-level tax estimates built from the same categorised bookkeeping data that powers the rest of the sole-trader workflow."
            : "Practical profit, VAT, and estimated tax figures built from the same categorised bookkeeping data that powers the reports."
        }
      />

      <TaxSummary
        taxSummary={taxSummary}
        periodOptions={periodOptions}
        selectedPeriod={selectedPeriod}
      />
    </>
  );
}
