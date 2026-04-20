import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { BudgetPageClient } from "@/components/bookkeeping/budget-page-client";
import { buildCategoryRuleMap, classifyTransaction } from "@/lib/accounting/classifier";
import { resolveCategory } from "@/lib/categories/suggester";

export const metadata = { title: "Budget vs. Actual" };

export default async function BudgetPage() {
  const repository = await getRepository();
  const [budgets, settings, runs, manualExpenses] = await Promise.all([
    repository.getCategoryBudgets(),
    repository.getSettingsSnapshot(),
    repository.getRunsWithTransactions(),
    repository.getManualExpenses(),
  ]);

  const currency = settings.workspace.defaultCurrency ?? "GBP";
  const categoryRuleMap = buildCategoryRuleMap(settings.categoryRules);

  // Aggregate actual spend by category this month and this year
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisYear = String(now.getFullYear());

  const spendByCategory: Record<string, { monthly: number; annual: number }> = {};

  function addSpend(category: string | undefined | null, amount: number, dateStr: string | undefined) {
    if (!category || !dateStr) return;
    const month = dateStr.slice(0, 7);
    const year = dateStr.slice(0, 4);
    if (!spendByCategory[category]) spendByCategory[category] = { monthly: 0, annual: 0 };
    if (year === thisYear) spendByCategory[category].annual += amount;
    if (month === thisMonth) spendByCategory[category].monthly += amount;
  }

  for (const run of runs) {
    for (const tx of run.transactions) {
      const catName = tx.category ?? resolveCategory(tx, settings.categoryRules);
      const cat = catName ? categoryRuleMap.get(catName) : undefined;
      const classified = classifyTransaction(tx, cat, settings.workspace.vatRegistered);
      if (classified.accountType === "expense") {
        addSpend(catName, Math.abs(classified.grossAmount), tx.transactionDate);
      }
    }
  }

  for (const exp of manualExpenses) {
    if (!exp.isMileage) {
      addSpend(exp.category, exp.amount, exp.date);
    }
  }

  // Build combined view: all budgeted categories + any categories with spend
  const allCategories = new Set([
    ...budgets.map((b) => b.category),
    ...Object.keys(spendByCategory),
  ]);

  const rows = Array.from(allCategories)
    .map((category) => {
      const budget = budgets.find((b) => b.category === category);
      const spend = spendByCategory[category] ?? { monthly: 0, annual: 0 };
      const budgetMonthly = budget?.period === "monthly" ? budget.amount : budget?.period === "annual" ? budget.amount / 12 : 0;
      const budgetAnnual = budget?.period === "annual" ? budget.amount : budget?.period === "monthly" ? budget.amount * 12 : 0;
      return { category, budgetId: budget?.id, budgetMonthly, budgetAnnual, budgetPeriod: budget?.period ?? null, spendMonthly: spend.monthly, spendAnnual: spend.annual };
    })
    .sort((a, b) => b.spendAnnual - a.spendAnnual);

  const activeCategories = settings.categoryRules
    .filter((r) => r.isActive && r.isVisible && r.accountType === "expense")
    .map((r) => r.category)
    .sort();

  return (
    <>
      <PageHeader
        eyebrow="Bookkeeping"
        title="Budget vs. Actual"
        description="Set spending targets by category and track how you're doing this month and year."
      />
      <BudgetPageClient
        rows={rows}
        categories={activeCategories}
        currency={currency}
        currentMonth={now.toLocaleString("en-GB", { month: "long", year: "numeric" })}
        currentYear={thisYear}
      />
    </>
  );
}
