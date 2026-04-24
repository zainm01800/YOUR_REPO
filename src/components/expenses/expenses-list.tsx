"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Paperclip, Trash2 } from "lucide-react";
import type { ManualExpense } from "@/lib/domain/types";

export type ExpenseEntry = ManualExpense & {
  source?: "manual" | "transaction";
  sourceLabel?: string;
};

interface ExpensesListProps {
  expenses: ExpenseEntry[];
  currency: string;
  title?: string;
  description?: string;
  claimStatus?: "claimable" | "not_claimable" | "needs_review";
}

export function ExpensesList({
  expenses,
  currency,
  title = "Entries",
  description,
  claimStatus,
}: ExpensesListProps) {
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

  const isMileageTab = expenses.length > 0 && expenses.every((e) => e.isMileage);

  const statusClass =
    claimStatus === "claimable"
      ? "bg-[var(--good-soft)] text-[var(--good)]"
      : claimStatus === "not_claimable"
        ? "bg-[var(--danger-soft)] text-[var(--danger)]"
        : claimStatus === "needs_review"
          ? "bg-[var(--amber-soft)] text-[var(--amber)]"
          : "bg-[#f0eee8] text-[var(--muted)]";

  return (
    <section className="cm-panel overflow-hidden p-0">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--ink)]">{title}</h2>
          {description ? <p className="mt-1 text-xs text-[var(--muted)]">{description}</p> : null}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
          {expenses.length} item{expenses.length !== 1 ? "s" : ""}
        </span>
      </div>

      {expenses.length === 0 ? (
        <div className="m-4 rounded-2xl border border-dashed border-[var(--line)] bg-white px-4 py-8 text-center text-sm text-[var(--muted)]">
          Nothing to show here yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--line)] text-sm">
            <thead className="cm-table-head text-left">
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
            <tbody className="divide-y divide-[var(--line-2)] bg-white">
              {expenses.map((exp) => (
                <tr key={exp.id} className="transition hover:bg-[#f8f6f0]">
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{exp.date}</td>
                  <td className="max-w-[220px] px-4 py-3">
                    <div className="truncate font-medium text-[var(--ink)]">{exp.description}</div>
                    <div className="truncate text-xs text-[var(--muted)]">
                      {exp.source === "transaction" ? exp.sourceLabel ?? "Imported bank transaction" : exp.notes}
                    </div>
                  </td>
                  {!isMileageTab && (
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {exp.merchant ?? "-"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-[var(--muted)]">{exp.category ?? "-"}</td>
                  {isMileageTab ? (
                    <td className="px-4 py-3">
                      {exp.mileageMiles != null ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--accent-ink)]">
                          <Car className="h-3 w-3" />
                          {exp.mileageMiles} mi
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  ) : (
                    <td className="px-4 py-3 text-center">
                      {exp.receiptStorageKey ? (
                        <span className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white p-1 text-[var(--accent-ink)]">
                          <Paperclip className="h-3 w-3" />
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">-</span>
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums text-[var(--ink)]">
                    {fmt(exp.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {exp.source === "transaction" ? (
                      <span className="rounded-full bg-[#f0eee8] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Bank
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDelete(exp.id)}
                        disabled={deleting === exp.id}
                        className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:opacity-40"
                        aria-label="Delete expense"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
