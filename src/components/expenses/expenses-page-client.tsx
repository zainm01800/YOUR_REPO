"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "./expense-form";
import { ExpensesList } from "./expenses-list";
import type { ManualExpense } from "@/lib/domain/types";

interface Props {
  expenses: ManualExpense[];
  categories: string[];
  vatCodes: string[];
  currency: string;
  totalExpenses: number;
  totalMileage: number;
  totalMiles: number;
}

export function ExpensesPageClient({
  expenses,
  categories,
  vatCodes,
  currency,
  totalExpenses,
  totalMileage,
  totalMiles,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { icon: Receipt, label: "Cash expenses", value: fmt(totalExpenses) },
          { icon: Car, label: "Mileage deductions", value: fmt(totalMileage) },
          { icon: Car, label: "Total miles", value: `${totalMiles.toFixed(0)} mi` },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-4"
          >
            <s.icon className="h-5 w-5 shrink-0 text-[var(--color-muted-foreground)]" />
            <div>
              <p className="text-lg font-bold tabular-nums leading-none">{s.value}</p>
              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add expense or mileage
        </Button>
      )}

      {showForm && (
        <ExpenseForm
          categories={categories}
          vatCodes={vatCodes}
          currency={currency}
          onSaved={() => {
            setShowForm(false);
            router.refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* List */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <h2 className="mb-4 text-base font-semibold text-[var(--color-foreground)]">All entries</h2>
        <ExpensesList expenses={expenses} currency={currency} />
      </div>
    </div>
  );
}
