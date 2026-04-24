"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CategoryRule } from "@/lib/domain/types";

interface BudgetRow {
  category: string;
  budgetId?: string;
  budgetMonthly: number;
  budgetAnnual: number;
  budgetPeriod: "monthly" | "annual" | null;
  spendMonthly: number;
  spendAnnual: number;
}

interface Props {
  rows: BudgetRow[];
  categoryRules: CategoryRule[];
  currency: string;
  currentMonth: string;
  currentYear: string;
}

function ProgressBar({ spent, budget }: { spent: number; budget: number }) {
  if (budget <= 0) return null;
  const pct = Math.min((spent / budget) * 100, 100);
  const over = spent > budget;
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
      <div
        className={`h-full rounded-full transition-all ${over ? "bg-[var(--color-danger)]" : pct > 80 ? "bg-amber-400" : "bg-emerald-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function BudgetPageClient({ rows, categoryRules, currency, currentMonth, currentYear }: Props) {
  const router = useRouter();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPeriod, setEditPeriod] = useState<"monthly" | "annual">("monthly");
  const [addingNew, setAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  async function saveBudget(category: string, amount: number, period: "monthly" | "annual") {
    setSaving(true);
    try {
      await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount, period }),
      });
      router.refresh();
      setEditingCategory(null);
      setAddingNew(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget(budgetId: string) {
    await fetch(`/api/budgets/${budgetId}`, { method: "DELETE" });
    router.refresh();
  }

  // Group unbudgeted categories by section for the optgroup dropdown
  const unbudgetedSections = useMemo(() => {
    const budgetedSet = new Set(rows.filter((r) => r.budgetId).map((r) => r.category));
    const map = new Map<string, CategoryRule[]>();
    for (const rule of categoryRules) {
      if (budgetedSet.has(rule.category)) continue;
      const existing = map.get(rule.section) ?? [];
      existing.push(rule);
      map.set(rule.section, existing);
    }
    return map;
  }, [categoryRules, rows]);

  return (
    <div className="space-y-6">
      {/* Add budget */}
      {!addingNew && (
        <Button variant="secondary" onClick={() => setAddingNew(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Set category budget
        </Button>
      )}

      {addingNew && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Select category…</option>
              {Array.from(unbudgetedSections.entries()).map(([section, rules]) => (
                <optgroup key={section} label={section}>
                  {rules.map((rule) => (
                    <option key={rule.slug} value={rule.category}>{rule.category}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">Budget amount</label>
            <input
              type="number"
              min="0"
              step="1"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              placeholder="500"
              className="w-28 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">Period</label>
            <select
              value={editPeriod}
              onChange={(e) => setEditPeriod(e.target.value as "monthly" | "annual")}
              className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none"
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button className="h-8 px-3 text-xs"
              disabled={!newCategory || !editAmount || saving}
              onClick={() => saveBudget(newCategory, parseFloat(editAmount), editPeriod)}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button className="h-8 px-3 text-xs" variant="secondary" onClick={() => setAddingNew(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Budget table */}
      <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)]">
        {/* Month column */}
        <div className="border-b border-[var(--color-border)] bg-white px-5 py-3">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_56px] gap-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            <span>Category</span>
            <span className="text-right">Budget / mo</span>
            <span className="text-right">{currentMonth} actual</span>
            <span className="text-right">Budget / yr</span>
            <span className="text-right">{currentYear} actual</span>
            <span />
          </div>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {rows.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              No spending data yet. Set a budget above to get started.
            </div>
          )}
          {rows.map((row) => {
            const isEditing = editingCategory === row.category;
            const monthlyOver = row.budgetMonthly > 0 && row.spendMonthly > row.budgetMonthly;
            const annualOver = row.budgetAnnual > 0 && row.spendAnnual > row.budgetAnnual;

            return (
              <div key={row.category} className="px-5 py-3 hover:bg-white/60 transition-colors">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_56px] items-center gap-4 text-sm">
                  <span className="font-medium text-[var(--color-foreground)]">{row.category}</span>

                  {/* Monthly budget */}
                  <div className="text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min="0"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-20 rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs"
                        />
                        <select
                          value={editPeriod}
                          onChange={(e) => setEditPeriod(e.target.value as "monthly" | "annual")}
                          className="rounded-lg border border-[var(--color-border)] px-1 py-1 text-xs"
                        >
                          <option value="monthly">mo</option>
                          <option value="annual">yr</option>
                        </select>
                        <button onClick={() => saveBudget(row.category, parseFloat(editAmount), editPeriod)} className="rounded p-1 text-emerald-600 hover:bg-emerald-50">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditingCategory(null)} className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)]">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className={`tabular-nums ${row.budgetMonthly > 0 ? "font-medium" : "text-[var(--color-muted-foreground)]"}`}>
                        {row.budgetMonthly > 0 ? fmt(row.budgetMonthly) : "—"}
                      </span>
                    )}
                  </div>

                  {/* Monthly actual */}
                  <div className="text-right">
                    <span className={`tabular-nums font-semibold ${monthlyOver ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]"}`}>
                      {fmt(row.spendMonthly)}
                    </span>
                    {row.budgetMonthly > 0 && (
                      <ProgressBar spent={row.spendMonthly} budget={row.budgetMonthly} />
                    )}
                  </div>

                  {/* Annual budget */}
                  <div className="text-right tabular-nums text-[var(--color-muted-foreground)]">
                    {row.budgetAnnual > 0 ? fmt(row.budgetAnnual) : "—"}
                  </div>

                  {/* Annual actual */}
                  <div className="text-right">
                    <span className={`tabular-nums font-semibold ${annualOver ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]"}`}>
                      {fmt(row.spendAnnual)}
                    </span>
                    {row.budgetAnnual > 0 && (
                      <ProgressBar spent={row.spendAnnual} budget={row.budgetAnnual} />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setEditingCategory(row.category);
                        setEditAmount(String(row.budgetPeriod === "monthly" ? row.budgetMonthly : row.budgetAnnual));
                        setEditPeriod(row.budgetPeriod ?? "monthly");
                      }}
                      className="rounded p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)] hover:text-[var(--color-foreground)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {row.budgetId && (
                      <button
                        onClick={() => deleteBudget(row.budgetId!)}
                        className="rounded p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
