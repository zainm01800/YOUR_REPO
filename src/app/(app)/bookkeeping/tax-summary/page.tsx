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
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { getCachedBookkeepingDataset } from "@/lib/data/cached-reads";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Tax Summary" };

export default async function BookkeepingTaxSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const selectedPeriod = params.period;

  try {
    const { workspace, viewerAccess } = await getServerViewerAccess();
    if (!viewerAccess.canReviewTax) {
      redirect("/dashboard");
    }
    const { settingsSnapshot, runs, unassignedBankTransactions: unassignedBankTxns } =
      await getCachedBookkeepingDataset(workspace.id);
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
          ? categoryRuleMap.get(resolvedCategoryName.trim().toLowerCase())
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
        ? categoryRuleMap.get(resolvedCategoryName.trim().toLowerCase())
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
          eyebrow={isSoleTrader ? "Sole trader accounts" : "Bookkeeping"}
          title={isSoleTrader ? "Tax year summary" : "Tax summary"}
          description={
            isSoleTrader
              ? "A simple owner-friendly view of income, claimable expenses, taxable profit, and estimated tax to set aside."
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
  } catch (err: any) {
    console.error("[tax-summary/page] Critical render error:", err);
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
        <h2 className="text-xl font-semibold text-[var(--ink)]">Failed to load tax summary</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {(err as Error).message || "An unexpected error occurred during rendering."}
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            href="/bookkeeping/tax-summary"
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-sm)]"
          >
            Retry page
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)]"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }
}
