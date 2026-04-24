import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { ExpensesPageClient } from "@/components/expenses/expenses-page-client";

export const metadata = { title: "Expenses & Mileage" };

export default async function ExpensesPage() {
  const repository = await getRepository();
  const [expenses, settings] = await Promise.all([
    repository.getManualExpenses(),
    repository.getSettingsSnapshot(),
  ]);

  const currency = settings.workspace.defaultCurrency ?? "GBP";
  const categoryRules = settings.categoryRules
    .filter((r) => r.isActive && r.isVisible)
    .sort((a, b) => a.section.localeCompare(b.section) || a.sortOrder - b.sortOrder || a.category.localeCompare(b.category));
  const vatCodes = [...new Set(settings.vatRules.map((v) => v.taxCode))].sort();

  const totalExpenses = expenses.filter((e) => !e.isMileage).reduce((s, e) => s + e.amount, 0);
  const totalMileage = expenses.filter((e) => e.isMileage).reduce((s, e) => s + e.amount, 0);
  const totalMiles = expenses
    .filter((e) => e.isMileage && e.mileageMiles != null)
    .reduce((s, e) => s + (e.mileageMiles ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Bookkeeping"
        title="Expenses & Mileage"
        description="Log cash expenses and business mileage not captured by your bank."
      />
      <ExpensesPageClient
        expenses={expenses}
        categoryRules={categoryRules}
        vatCodes={vatCodes}
        currency={currency}
        totalExpenses={totalExpenses}
        totalMileage={totalMileage}
        totalMiles={totalMiles}
      />
    </>
  );
}
