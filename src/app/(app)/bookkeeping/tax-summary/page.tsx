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

  const repository = getRepository();
  const snapshot = await repository.getDashboardSnapshot();
  const categoryRuleMap = buildCategoryRuleMap(snapshot.categoryRules);
  const periodOptions = Array.from(
    new Set(snapshot.runs.map((run) => run.period).filter((period): period is string => Boolean(period))),
  ).sort((a, b) => b.localeCompare(a));

  const allTransactions: ClassifiedTransaction[] = [];

  for (const runSummary of snapshot.runs) {
    if (selectedPeriod && runSummary.period !== selectedPeriod) {
      continue;
    }

    const run = await repository.getRun(runSummary.id);
    if (!run || run.transactions.length === 0) continue;

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
  const vatReport = buildVatReport(
    allTransactions,
    snapshot.workspace.defaultCurrency,
    snapshot.workspace.vatRegistered,
  );
  const taxSummary = buildTaxSummaryReport({
    pnl,
    vatReport,
    businessType: snapshot.workspace.businessType,
    currency: snapshot.workspace.defaultCurrency,
    classifiedTransactions: allTransactions,
  });

  return (
    <>
      <PageHeader
        eyebrow="Bookkeeping"
        title="Tax summary"
        description="Practical profit, VAT, and estimated tax figures built from the same categorised bookkeeping data that powers the reports."
      />

      <TaxSummary
        taxSummary={taxSummary}
        pnl={pnl}
        vatReport={vatReport}
        periodOptions={periodOptions}
        selectedPeriod={selectedPeriod}
      />
    </>
  );
}
