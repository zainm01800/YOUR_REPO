"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X, Check, LayoutGrid, List } from "lucide-react";
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
  const warn = !over && pct > 80;
  const barColor = over ? "bg-[var(--color-danger)]" : warn ? "bg-amber-400" : "bg-[var(--color-accent)]";

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
      <div
        className={`h-full rounded-full transition-all ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BudgetCard({
  row,
  currency,
  currentMonth,
  currentYear,
  onEdit,
  onDelete,
}: {
  row: BudgetRow;
  currency: string;
  currentMonth: string;
  currentYear: string;
  onEdit: () => void;
  onDelete: (id: string) => void;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const monthlyOver = row.budgetMonthly > 0 && row.spendMonthly > row.budgetMonthly;
  const annualOver = row.budgetAnnual > 0 && row.spendAnnual > row.budgetAnnual;
  const hasAnyOver = monthlyOver || annualOver;
  const noSpend = row.spendMonthly === 0 && row.spendAnnual === 0;
  const statusLabel = hasAnyOver ? "Over budget" : noSpend ? "No spend" : "On track";
  const statusStyle = hasAnyOver
    ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger-border)]"
    : noSpend
      ? "bg-[var(--color-panel)] text-[var(--color-muted-foreground)] border-[var(--color-border)]"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-panel)] ${
        hasAnyOver ? "border-[var(--color-danger-border)]" : "border-[var(--line)]"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{row.category}</h3>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
              {statusLabel}
            </span>
          </div>
          {row.budgetMonthly > 0 && (
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
              {fmt(row.budgetMonthly)}/mo · {fmt(row.budgetAnnual)}/yr budget
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)] hover:text-[var(--color-foreground)] transition"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {row.budgetId && (
            <button
              onClick={() => onDelete(row.budgetId!)}
              className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Monthly */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--color-muted-foreground)]">{currentMonth}</span>
            <span className={`font-bold tabular-nums ${monthlyOver ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]"}`}>
              {fmt(row.spendMonthly)}
              {row.budgetMonthly > 0 && (
                <span className="font-normal text-[var(--color-muted-foreground)]"> / {fmt(row.budgetMonthly)}</span>
              )}
            </span>
          </div>
          <ProgressBar spent={row.spendMonthly} budget={row.budgetMonthly} />
          {row.budgetMonthly <= 0 && (
            <div className="h-1.5 w-full rounded-full bg-[var(--color-border)]" />
          )}
        </div>

        {/* Annual */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--color-muted-foreground)]">{currentYear} YTD</span>
            <span className={`font-bold tabular-nums ${annualOver ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]"}`}>
              {fmt(row.spendAnnual)}
              {row.budgetAnnual > 0 && (
                <span className="font-normal text-[var(--color-muted-foreground)]"> / {fmt(row.budgetAnnual)}</span>
              )}
            </span>
          </div>
          <ProgressBar spent={row.spendAnnual} budget={row.budgetAnnual} />
          {row.budgetAnnual <= 0 && (
            <div className="h-1.5 w-full rounded-full bg-[var(--color-border)]" />
          )}
        </div>
      </div>
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

  const editingRow = rows.find((r) => r.category === editingCategory);

  // Summary stats
  const budgetedRows = rows.filter((r) => r.budgetId);
  const overBudgetCount = budgetedRows.filter(
    (r) => r.spendMonthly > r.budgetMonthly || r.spendAnnual > r.budgetAnnual
  ).length;
  const onTrackCount = budgetedRows.length - overBudgetCount;
  const totalBudgetAnnual = rows.reduce((s, r) => s + r.budgetAnnual, 0);
  const totalSpentAnnual = rows.reduce((s, r) => s + r.spendAnnual, 0);

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-4">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">On Track</span>
            <span className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-600">
              {onTrackCount}<span className="text-base font-medium text-[var(--color-muted-foreground)]">/{budgetedRows.length}</span>
            </span>
            <span className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">categories within budget</span>
          </div>
          <div className={`flex flex-col rounded-2xl border px-5 py-4 ${overBudgetCount > 0 ? "border-[var(--color-danger-border)] bg-[var(--color-danger-soft)]" : "border-[var(--color-border)] bg-[var(--color-panel)]"}`}>
            <span className={`text-xs font-semibold uppercase tracking-[0.14em] ${overBudgetCount > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-muted-foreground)]"}`}>Over Budget</span>
            <span className={`mt-1.5 text-2xl font-bold tabular-nums ${overBudgetCount > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]"}`}>{overBudgetCount}</span>
            <span className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">categories exceeded</span>
          </div>
          <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-4">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Total Spent</span>
            <span className="mt-1.5 text-2xl font-bold tabular-nums text-[var(--color-foreground)]">{fmt(totalSpentAnnual)}</span>
            <span className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">of {fmt(totalBudgetAnnual)} annual budget</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 rounded-2xl border border-[var(--line)] bg-[var(--color-panel)] p-1.5">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              viewMode === "grid"
                ? "bg-white text-[var(--ink)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              viewMode === "list"
                ? "bg-white text-[var(--ink)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Table
          </button>
        </div>

        {!addingNew && (
          <Button variant="secondary" onClick={() => setAddingNew(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Set category budget
          </Button>
        )}
      </div>

      {/* Add new budget form */}
      {addingNew && (
        <div className="cm-panel-subtle flex flex-wrap items-end gap-3 p-4">
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
            <Button
              className="h-8 px-3 text-xs"
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

      {/* Edit inline form */}
      {editingCategory && editingRow && (
        <div className="cm-panel-subtle flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
              Editing: <span className="text-[var(--color-foreground)]">{editingCategory}</span>
            </label>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">Amount</label>
            <input
              type="number"
              min="0"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
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
            <Button
              className="h-8 px-3 text-xs"
              disabled={!editAmount || saving}
              onClick={() => saveBudget(editingCategory, parseFloat(editAmount), editPeriod)}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button className="h-8 px-3 text-xs" variant="secondary" onClick={() => setEditingCategory(null)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--color-panel)] p-12 text-center">
          <p className="text-sm font-medium text-[var(--color-foreground)]">No spending data yet</p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Set a category budget above to start tracking.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* Card grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <BudgetCard
              key={row.category}
              row={row}
              currency={currency}
              currentMonth={currentMonth}
              currentYear={currentYear}
              onEdit={() => {
                setEditingCategory(row.category);
                setEditAmount(String(row.budgetPeriod === "monthly" ? row.budgetMonthly : row.budgetAnnual));
                setEditPeriod(row.budgetPeriod ?? "monthly");
              }}
              onDelete={deleteBudget}
            />
          ))}
        </div>
      ) : (
        /* Table view */
          <div className="cm-panel overflow-hidden">
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
            {rows.map((row) => {
              const monthlyOver = row.budgetMonthly > 0 && row.spendMonthly > row.budgetMonthly;
              const annualOver = row.budgetAnnual > 0 && row.spendAnnual > row.budgetAnnual;
              return (
                <div key={row.category} className="px-5 py-3 hover:bg-white/60 transition-colors">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_56px] items-center gap-4 text-sm">
                    <span className="font-medium text-[var(--color-foreground)]">{row.category}</span>
                    <div className="text-right tabular-nums">
                      {row.budgetMonthly > 0 ? fmt(row.budgetMonthly) : <span className="text-[var(--color-muted-foreground)]">—</span>}
                    </div>
                    <div className="text-right">
                      <span className={`tabular-nums font-semibold ${monthlyOver ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]"}`}>
                        {fmt(row.spendMonthly)}
                      </span>
                    </div>
                    <div className="text-right tabular-nums text-[var(--color-muted-foreground)]">
                      {row.budgetAnnual > 0 ? fmt(row.budgetAnnual) : "—"}
                    </div>
                    <div className="text-right">
                      <span className={`tabular-nums font-semibold ${annualOver ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]"}`}>
                        {fmt(row.spendAnnual)}
                      </span>
                    </div>
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
      )}
    </div>
  );
}
