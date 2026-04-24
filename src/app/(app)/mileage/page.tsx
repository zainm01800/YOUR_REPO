import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { ExpensesPageClient } from "@/components/expenses/expenses-page-client";
import { categorySectionSort } from "@/lib/categories/sections";

export const metadata = { title: "Mileage" };

export default async function MileagePage() {
  const repository = await getRepository();
  const [expenses, settings] = await Promise.all([
    repository.getManualExpenses(),
    repository.getSettingsSnapshot(),
  ]);

  const currency = settings.workspace.defaultCurrency ?? "GBP";
  const categoryRules = settings.categoryRules
    .filter((r) => r.isActive && r.isVisible)
    .sort(categorySectionSort);
  const vatCodes = [...new Set(settings.vatRules.map((v) => v.taxCode))].sort();

  const totalExpenses = expenses.filter((e) => !e.isMileage).reduce((s, e) => s + e.amount, 0);
  const totalMileage = expenses.filter((e) => e.isMileage).reduce((s, e) => s + e.amount, 0);
  const totalMiles = expenses
    .filter((e) => e.isMileage && e.mileageMiles != null)
    .reduce((s, e) => s + (e.mileageMiles ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Import"
        title="Mileage"
        description="Log business mileage and see what can be claimed separately from bank transactions."
      />
      <ExpensesPageClient
        expenses={expenses}
        categoryRules={categoryRules}
        vatCodes={vatCodes}
        currency={currency}
        totalExpenses={totalExpenses}
        totalMileage={totalMileage}
        totalMiles={totalMiles}
        initialTab="mileage"
      />
    </>
  );
}
