"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Paperclip, Trash2 } from "lucide-react";
import type { ManualExpense } from "@/lib/domain/types";

interface ExpensesListProps {
  expenses: ManualExpense[];
  currency: string;
}

export function ExpensesList({ expenses, currency }: ExpensesListProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
        No expenses logged yet. Use the form above to add your first expense or mileage entry.
      </div>
    );
  }

  // Separate mileage vs cash so we can show different columns
  const isMileageTab = expenses.every((e) => e.isMileage);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
      <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
        <thead className="bg-white text-left text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Description</th>
            {!isMileageTab && <th className="px-4 py-3">Merchant</th>}
            <th className="px-4 py-3">Category</th>
            {isMileageTab ? (
              <th className="px-4 py-3">Miles</th>
            ) : (
              <th className="px-4 py-3 text-center">Receipt</th>
            )}
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-panel)]">
          {expenses.map((exp) => (
            <tr key={exp.id} className="hover:bg-white/60 transition-colors">
              <td className="px-4 py-3 text-[var(--color-muted-foreground)] whitespace-nowrap">{exp.date}</td>
              <td className="px-4 py-3 max-w-[200px]">
                <div className="font-medium text-[var(--color-foreground)] truncate">{exp.description}</div>
                {exp.notes && (
                  <div className="text-xs text-[var(--color-muted-foreground)] truncate">{exp.notes}</div>
                )}
              </td>
              {!isMileageTab && (
                <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                  {exp.merchant ?? <span className="text-[var(--color-muted-foreground)]">—</span>}
                </td>
              )}
              <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{exp.category ?? "—"}</td>
              {isMileageTab ? (
                <td className="px-4 py-3">
                  {exp.mileageMiles != null ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)]">
                      <Car className="h-3 w-3" />
                      {exp.mileageMiles} mi
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              ) : (
                <td className="px-4 py-3 text-center">
                  {exp.receiptStorageKey ? (
                    <span className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white p-1 text-[var(--color-accent)]">
                      <Paperclip className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="text-[var(--color-muted-foreground)]">—</span>
                  )}
                </td>
              )}
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-[var(--color-foreground)] whitespace-nowrap">
                {fmt(exp.amount)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleDelete(exp.id)}
                  disabled={deleting === exp.id}
                  className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
