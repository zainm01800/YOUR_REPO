"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "./expense-form";
import { ExpensesList, type ExpenseEntry } from "./expenses-list";
import type { CategoryRule } from "@/lib/domain/types";

interface Props {
  expenses: ExpenseEntry[];
  categoryRules: CategoryRule[];
  vatCodes: string[];
  currency: string;
  totalExpenses: number;
  totalMileage: number;
  totalMiles: number;
  initialTab?: Tab;
}

type Tab = "expenses" | "mileage";

export function ExpensesPageClient({
  expenses,
  categoryRules,
  vatCodes,
  currency,
  totalExpenses,
  totalMileage,
  totalMiles,
  initialTab = "expenses",
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const activeTab: Tab = initialTab;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

  const cashExpenses = expenses.filter((e) => !e.isMileage);
  const mileageEntries = expenses.filter((e) => e.isMileage);

  const displayedExpenses = activeTab === "expenses" ? cashExpenses : mileageEntries;
  const categoryMap = new Map(categoryRules.map((rule) => [rule.category.toLowerCase(), rule]));
  const getClaimStatus = (expense: ExpenseEntry): "claimable" | "not_claimable" | "needs_review" => {
    if (expense.isMileage) return "claimable";
    if (expense.source === "transaction" && !expense.category) return "needs_review";
    if (!expense.category) return "needs_review";
    const rule = categoryMap.get(expense.category.toLowerCase());
    if (!rule) return "needs_review";
    return rule.allowableForTax && rule.allowablePercentage > 0 ? "claimable" : "not_claimable";
  };
  const claimableExpenses = displayedExpenses.filter((expense) => getClaimStatus(expense) === "claimable");
  const nonClaimableExpenses = displayedExpenses.filter((expense) => getClaimStatus(expense) === "not_claimable");
  const needsReviewExpenses = displayedExpenses.filter((expense) => getClaimStatus(expense) === "needs_review");
  const claimableTotal = claimableExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const nonClaimableTotal = nonClaimableExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: Receipt,
            label: "Cash expenses",
            value: fmt(totalExpenses),
            sub: `${cashExpenses.length} entries`,
            accent: false,
          },
          {
            icon: Car,
            label: "Mileage deductions",
            value: fmt(totalMileage),
            sub: `${mileageEntries.length} trips`,
            accent: false,
          },
          {
            icon: Car,
            label: "Total miles",
            value: `${totalMiles.toFixed(0)} mi`,
            sub: "business travel",
            accent: false,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                {s.label}
              </span>
            </div>
            <span className="text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
              {s.value}
            </span>
            <span className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{s.sub}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="cm-kpi">
          <p className="cm-kpi-label">Claimable</p>
          <p className="cm-kpi-value text-[var(--good)]">{fmt(claimableTotal)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {claimableExpenses.length} item{claimableExpenses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="cm-kpi">
          <p className="cm-kpi-label">Not claimable</p>
          <p className="cm-kpi-value text-[var(--color-danger)]">{fmt(nonClaimableTotal)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {nonClaimableExpenses.length} item{nonClaimableExpenses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="cm-kpi">
          <p className="cm-kpi-label">Needs review</p>
          <p className="cm-kpi-value text-[var(--amber)]">{needsReviewExpenses.length}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Missing or unknown category
          </p>
        </div>
      </div>

      {/* Add button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            {activeTab === "expenses" ? "Expense entries" : "Mileage entries"}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {activeTab === "expenses"
              ? "Cash/card costs that are not already imported from bank statements."
              : "Business mileage claims calculated separately from supplier spend."}
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {activeTab === "expenses" ? "Add expense" : "Log mileage"}
          </Button>
        )}
      </div>

      {showForm && (
        <ExpenseForm
          categoryRules={categoryRules}
          vatCodes={vatCodes}
          currency={currency}
          defaultIsMileage={activeTab === "mileage"}
          onSaved={() => {
            setShowForm(false);
            router.refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Claimability sections */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ExpensesList
          title="Claimable"
          description="These reduce taxable profit based on your category settings."
          expenses={claimableExpenses}
          currency={currency}
          claimStatus="claimable"
        />
        <ExpensesList
          title="Not claimable"
          description="These are tracked, but currently excluded from tax claim calculations."
          expenses={nonClaimableExpenses}
          currency={currency}
          claimStatus="not_claimable"
        />
      </div>
      {needsReviewExpenses.length > 0 && (
        <ExpensesList
          title="Needs review"
          description="Add or correct the category before relying on the claimable total."
          expenses={needsReviewExpenses}
          currency={currency}
          claimStatus="needs_review"
        />
      )}
    </div>
  );
}
