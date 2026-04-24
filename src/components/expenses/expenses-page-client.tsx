"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "./expense-form";
import { ExpensesList } from "./expenses-list";
import type { CategoryRule, ManualExpense } from "@/lib/domain/types";

interface Props {
  expenses: ManualExpense[];
  categoryRules: CategoryRule[];
  vatCodes: string[];
  currency: string;
  totalExpenses: number;
  totalMileage: number;
  totalMiles: number;
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
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("expenses");

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

  const cashExpenses = expenses.filter((e) => !e.isMileage);
  const mileageEntries = expenses.filter((e) => e.isMileage);

  const displayedExpenses = activeTab === "expenses" ? cashExpenses : mileageEntries;

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

      {/* Tabs + Add button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-1">
          {(["expenses", "mileage"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setShowForm(false);
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition capitalize ${
                activeTab === tab
                  ? "bg-white text-[var(--color-foreground)] shadow-sm"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }`}
            >
              {tab === "expenses" ? <Receipt className="h-3.5 w-3.5" /> : <Car className="h-3.5 w-3.5" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  activeTab === tab
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "bg-[var(--color-border)] text-[var(--color-muted-foreground)]"
                }`}
              >
                {tab === "expenses" ? cashExpenses.length : mileageEntries.length}
              </span>
            </button>
          ))}
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

      {/* List */}
      <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="border-b border-[var(--color-border)] bg-white px-5 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            {activeTab === "expenses" ? "Expense entries" : "Mileage entries"}
          </h2>
        </div>
        <div className="p-4">
          <ExpensesList expenses={displayedExpenses} currency={currency} />
        </div>
      </div>
    </div>
  );
}
