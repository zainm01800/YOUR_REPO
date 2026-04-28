import { PageHeader } from "@/components/app-shell/page-header";
import { VatReconciliation } from "@/components/bookkeeping/vat-reconciliation";
import {
  buildCategoryRuleMap,
  classifyTransaction,
  type ClassifiedTransaction,
} from "@/lib/accounting/classifier";
import { buildVatReport } from "@/lib/accounting/reports";
import { resolveCategory } from "@/lib/categories/suggester";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { getCachedBookkeepingDataset } from "@/lib/data/cached-reads";
import { redirect } from "next/navigation";

export const metadata = { title: "VAT Reconciliation" };

export default async function VatReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const selectedPeriod = params.period;

  const { workspace, viewerAccess } = await getServerViewerAccess();
  if (!viewerAccess.canReviewTax || !workspace.vatRegistered) {
    redirect("/bookkeeping/tax-summary");
  }
  const { settingsSnapshot, runs, unassignedBankTransactions: unassignedBankTxns } =
    await getCachedBookkeepingDataset(workspace.id);

  const categoryRuleMap = buildCategoryRuleMap(settingsSnapshot.categoryRules);
  const periodOptions = Array.from(
    new Set(runs.map((r) => r.period).filter((p): p is string => Boolean(p))),
  ).sort((a, b) => b.localeCompare(a));

  const allTransactions: ClassifiedTransaction[] = [];

  for (const run of runs) {
    if (selectedPeriod && run.period !== selectedPeriod) continue;
    for (const tx of run.transactions) {
      const catName = tx.category ?? resolveCategory(tx, settingsSnapshot.categoryRules);
      const cat = catName ? categoryRuleMap.get(catName) : undefined;
      allTransactions.push(
        classifyTransaction(tx, cat, settingsSnapshot.workspace.vatRegistered),
      );
    }
  }

  for (const tx of unassignedBankTxns) {
    const catName = tx.category ?? resolveCategory(tx, settingsSnapshot.categoryRules);
    const cat = catName ? categoryRuleMap.get(catName) : undefined;
    allTransactions.push(
      classifyTransaction(tx, cat, settingsSnapshot.workspace.vatRegistered),
    );
  }

  const vatReport = buildVatReport(
    allTransactions,
    settingsSnapshot.workspace.defaultCurrency,
    settingsSnapshot.workspace.vatRegistered,
  );

  return (
    <>
      <PageHeader
        eyebrow="Bookkeeping"
        title="VAT reconciliation"
        description="Review your VAT position and prepare your return figures from categorised transactions."
      />
      <VatReconciliation
        vatReport={vatReport}
        periodOptions={periodOptions}
        selectedPeriod={selectedPeriod}
        currency={settingsSnapshot.workspace.defaultCurrency}
        vatRegistered={settingsSnapshot.workspace.vatRegistered}
      />
    </>
  );
}
