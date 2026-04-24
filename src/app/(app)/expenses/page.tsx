import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { ExpensesPageClient } from "@/components/expenses/expenses-page-client";
import type { ExpenseEntry } from "@/components/expenses/expenses-list";
import { categorySectionSort } from "@/lib/categories/sections";
import { classifyTransactions } from "@/lib/accounting/classifier";
import type { CategoryRule, TransactionRecord } from "@/lib/domain/types";

export const metadata = { title: "Expenses" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab = tab === "mileage" ? "mileage" : "expenses";
  const repository = await getRepository();
  const [manualExpenses, settings, runs, unassignedBankTransactions] = await Promise.all([
    repository.getManualExpenses(),
    repository.getSettingsSnapshot(),
    repository.getRunsWithTransactions(),
    repository.getUnassignedBankTransactions(),
  ]);

  const currency = settings.workspace.defaultCurrency ?? "GBP";
  const categoryRules = settings.categoryRules
    .filter((r) => r.isActive && r.isVisible)
    .sort(categorySectionSort);
  const vatCodes = [...new Set(settings.vatRules.map((v) => v.taxCode))].sort();

  const transactionExpenses = buildTransactionExpenses(
    [
      ...runs.flatMap((run) =>
        run.transactions.map((transaction) => ({
          ...transaction,
          runId: run.id,
          runName: run.name,
          period: run.period,
        })),
      ),
      ...unassignedBankTransactions,
    ],
    settings.categoryRules,
    settings.workspace.vatRegistered,
    currency,
    settings.workspace.id,
  );
  
  const manualExpensesWithOverride = manualExpenses.map(me => ({
    ...me,
    allowableOverride: me.isClaimableOverride ?? undefined,
  }));

  const expenses = [...manualExpensesWithOverride, ...transactionExpenses].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  const totalExpenses = expenses.filter((e) => !e.isMileage).reduce((s, e) => s + e.amount, 0);
  const totalMileage = expenses.filter((e) => e.isMileage).reduce((s, e) => s + e.amount, 0);
  const totalMiles = expenses
    .filter((e) => e.isMileage && e.mileageMiles != null)
    .reduce((s, e) => s + (e.mileageMiles ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Import"
        title={initialTab === "mileage" ? "Mileage" : "Expenses"}
        description={
          initialTab === "mileage"
            ? "Log business mileage and see what can be claimed separately from bank transactions."
            : "Log cash expenses and see which costs are claimable or need review."
        }
      />
      <ExpensesPageClient
        expenses={expenses}
        categoryRules={categoryRules}
        vatCodes={vatCodes}
        currency={currency}
        totalExpenses={totalExpenses}
        totalMileage={totalMileage}
        totalMiles={totalMiles}
        initialTab={initialTab}
      />
    </>
  );
}

function buildTransactionExpenses(
  transactions: TransactionRecord[],
  categoryRules: CategoryRule[],
  vatRegistered: boolean,
  currency: string,
  workspaceId: string,
): ExpenseEntry[] {
  const classified = classifyTransactions(transactions, categoryRules, vatRegistered);
  const byId = new Map(transactions.map((transaction) => [transaction.id, transaction]));

  return classified
    .filter((transaction) => transaction.accountType === "expense" && transaction.statementType === "p_and_l")
    .map((transaction) => {
      const source = byId.get(transaction.transactionId);
      return {
        id: `tx:${transaction.transactionId}`,
        date: transaction.date ?? source?.postedDate ?? "",
        description: transaction.description || transaction.merchant || "Imported expense",
        merchant: transaction.merchant || null,
        category: transaction.category === "Uncategorised" ? null : transaction.category,
        vatCode: source?.vatCode ?? null,
        glCode: transaction.glCode ?? null,
        amount: transaction.grossAmount,
        currency: transaction.currency || currency,
        isMileage: false,
        mileageMiles: null,
        mileageRatePerMile: null,
        receiptStorageKey: null,
        notes: source?.runName ?? source?.bankStatementName ?? "Imported bank transaction",
        workspaceId,
        createdAt: transaction.date ?? source?.postedDate ?? "",
        source: "transaction",
        sourceLabel: source?.runName ?? source?.bankStatementName ?? "Imported bank transaction",
        allowableOverride: typeof source?.noReceiptRequired === "boolean" ? !source.noReceiptRequired : undefined,
      };
    });
}
