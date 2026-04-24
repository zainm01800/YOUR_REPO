"use client";
import { Fragment, useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { CategoryRule, TransactionRecord } from "@/lib/domain/types";
import { resolveCategoryWithConfidence } from "@/lib/categories/suggester";
import { fmtAmount, fmtDate } from "./transaction-row";
import {
  updateTransactionCategoryAction,
} from "@/app/actions/bookkeeping";

interface Props {
  transactions: TransactionRecord[];
  categoryRules: CategoryRule[];
  pickerCategoryRules: CategoryRule[];
  vatRegistered: boolean;
  canUseAi?: boolean;
  totalIn: number;
  totalOut: number;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
  };
}

type TypeFilter = "all" | "income" | "expense";

export function TransactionsTable({
  transactions,
  categoryRules,
  pickerCategoryRules,
  totalIn,
  totalOut,
  pagination,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [localTransactions, setLocalTransactions] = useState(transactions);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState<TypeFilter>("all");
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  const rowsWithCategory = useMemo(
    () =>
      localTransactions.map((tx) => {
        const override = categoryOverrides[tx.id];
        const { category: resolved } = resolveCategoryWithConfidence(
          { ...tx, category: override ?? tx.category },
          categoryRules,
        );
        return { ...tx, resolvedCategory: resolved ?? "" };
      }),
    [localTransactions, categoryRules, categoryOverrides],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rowsWithCategory.filter((tx) => {
      if (filterType === "income" && tx.amount < 0) return false;
      if (filterType === "expense" && tx.amount >= 0) return false;
      if (filterCategory !== "all") {
        const cat = tx.resolvedCategory || "Uncategorised";
        if (filterCategory === "uncategorised" ? cat !== "Uncategorised" : cat !== filterCategory) return false;
      }
      if (!q) return true;
      return (
        tx.merchant.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q) ||
        (tx.resolvedCategory || "").toLowerCase().includes(q)
      );
    });
  }, [rowsWithCategory, search, filterCategory, filterType]);

  const monthGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string;
        income: number;
        expense: number;
        rows: typeof filtered;
      }
    >();

    for (const tx of filtered) {
      const date = tx.transactionDate ? new Date(tx.transactionDate) : null;
      const validDate = date && !Number.isNaN(date.getTime());
      const key = validDate
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        : "no-date";
      const label = validDate
        ? date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        : "No date";

      const group = groups.get(key) ?? {
        label,
        income: 0,
        expense: 0,
        rows: [],
      };
      if (tx.amount >= 0) {
        group.income += tx.amount;
      } else {
        group.expense += Math.abs(tx.amount);
      }
      group.rows.push(tx);
      groups.set(key, group);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (a === "no-date") return 1;
        if (b === "no-date") return -1;
        return b.localeCompare(a);
      })
      .map(([, group]) => group);
  }, [filtered]);

  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const tx of rowsWithCategory) {
      const cat = (tx.resolvedCategory || "Uncategorised").trim();
      if (!seen.has(cat.toLowerCase())) {
        seen.add(cat.toLowerCase());
        result.push(cat);
      }
    }
    return result.sort((a, b) => a.localeCompare(b));
  }, [rowsWithCategory]);

  const uniquePickerRules = useMemo(() => {
    const seen = new Set<string>();
    return pickerCategoryRules.filter((rule) => {
      const name = rule.category.trim().toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [pickerCategoryRules]);

  // Build optgroup map for the category picker
  const pickerSections = useMemo(() => {
    const map = new Map<string, CategoryRule[]>();
    for (const rule of uniquePickerRules) {
      const existing = map.get(rule.section) ?? [];
      existing.push(rule);
      map.set(rule.section, existing);
    }
    return map;
  }, [uniquePickerRules]);

  const handleSaveCategory = useCallback(async (txId: string, newCategory: string) => {
    if (!newCategory) { setEditingId(null); return; }
    setSaving(txId);
    setSaveError(null);
    try {
      await updateTransactionCategoryAction(txId, newCategory);
      setLocalTransactions((prev) =>
        prev.map((tx) => (tx.id === txId ? { ...tx, category: newCategory } : tx)),
      );
      setCategoryOverrides((prev) => ({ ...prev, [txId]: newCategory }));
      setSavedId(txId);
      setTimeout(() => setSavedId((id) => (id === txId ? null : id)), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save category.");
    } finally {
      setSaving(null);
      setEditingId(null);
    }
  }, []);

  function exportCsv() {
    const headers = ["Date", "Description", "Category", "Type", "VAT", "Amount", "Currency"];
    const rows = filtered.map((tx) => [
      fmtDate(tx.transactionDate),
      `"${(tx.merchant || tx.description).replace(/"/g, '""')}"`,
      tx.resolvedCategory || "",
      tx.amount >= 0 ? "Income" : "Expense",
      tx.vatCode || "",
      tx.amount.toFixed(2),
      tx.currency,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

  const net = totalIn - totalOut;

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
        >
          <option value="all">All categories</option>
          <option value="uncategorised">Uncategorised</option>
          {uniqueCategories
            .filter((c) => c !== "Uncategorised")
            .map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
        </select>

        {/* Type tabs */}
        <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-1">
          {(["All", "Income", "Expense"] as const).map((label) => {
            const val = label.toLowerCase() as TypeFilter;
            const active = filterType === val;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setFilterType(val)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-white text-[var(--color-foreground)] shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Export */}
        <button
          type="button"
          onClick={exportCsv}
          className="ml-auto flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-panel)]"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Error */}
      {saveError && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {saveError}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "TOTAL IN", value: fmt(totalIn), color: "text-emerald-600" },
          { label: "TOTAL OUT", value: fmt(totalOut), color: "text-[var(--color-danger)]" },
          { label: "NET", value: fmt(net), color: "text-[var(--color-accent)]" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-5"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                ✦ {s.label}
              </span>
            </div>
            <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead>
              <tr className="bg-[var(--color-panel)] text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">VAT</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
                    No transactions match your filters.
                  </td>
                </tr>
              ) : (
                monthGroups.map((group) => (
                  <Fragment key={group.label}>
                    <tr className="bg-[#f6f4ee]">
                      <td colSpan={6} className="px-5 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                              {group.label}
                            </p>
                            <p className="text-xs text-[var(--muted)]">
                              {group.rows.length} transaction{group.rows.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="rounded-full bg-white px-2.5 py-1 font-medium text-emerald-700">
                              In {fmt(group.income)}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 font-medium text-[var(--color-danger)]">
                              Out {fmt(group.expense)}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {group.rows.map((tx) => {
                  const isIncome = tx.amount >= 0;
                  const isEditing = editingId === tx.id;
                  const isSaving = saving === tx.id;
                  const justSaved = savedId === tx.id;

                  return (
                    <tr key={tx.id} className="hover:bg-[var(--color-panel)]/50 transition-colors">
                      {/* Date */}
                      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                        {fmtDate(tx.transactionDate, "short")}
                      </td>

                      {/* Description */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <span className="block truncate font-medium text-[var(--color-foreground)]" title={tx.merchant || tx.description}>
                          {tx.merchant || tx.description}
                        </span>
                        {tx.merchant && tx.description && tx.description !== tx.merchant && (
                          <span className="block truncate text-xs text-[var(--color-muted-foreground)]" title={tx.description}>
                            {tx.description}
                          </span>
                        )}
                      </td>

                      {/* Category — click to edit */}
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <form
                            onSubmit={(e) => { e.preventDefault(); handleSaveCategory(tx.id, editValue); }}
                            className="flex items-center gap-1.5"
                          >
                            <select
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 w-44 rounded-lg border border-[var(--color-accent)] bg-white px-1.5 text-xs focus:outline-none"
                            >
                              <option value="" disabled>Select…</option>
                              {Array.from(pickerSections.entries()).map(([section, rules]) => (
                                <optgroup key={section} label={section}>
                                  {rules.map((rule) => (
                                    <option key={rule.slug} value={rule.category}>{rule.category}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            <button type="submit" disabled={isSaving} className="h-7 rounded-lg bg-[var(--color-accent)] px-2 text-xs font-medium text-white disabled:opacity-50">
                              {isSaving ? "…" : "Save"}
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} className="h-7 rounded-lg border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)]">
                              ✕
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setEditingId(tx.id); setEditValue(tx.resolvedCategory || ""); }}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] ${
                              justSaved
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : tx.resolvedCategory
                                  ? "border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-foreground)]"
                                  : "border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)] italic"
                            }`}
                          >
                            {tx.resolvedCategory || "Uncategorised"}
                          </button>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                          isIncome ? "text-emerald-600" : "text-[var(--color-muted-foreground)]"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isIncome ? "bg-emerald-500" : "bg-[var(--color-muted-foreground)]"}`} />
                          {isIncome ? "Income" : "Expense"}
                        </span>
                      </td>

                      {/* VAT */}
                      <td className="px-5 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                        {tx.vatCode || "—"}
                      </td>

                      {/* Amount */}
                      <td className={`px-5 py-3.5 text-right tabular-nums font-semibold whitespace-nowrap ${
                        isIncome ? "text-emerald-600" : "text-[var(--color-danger)]"
                      }`}>
                        {isIncome ? "+" : "−"}
                        {new Intl.NumberFormat("en-GB", { style: "currency", currency: tx.currency }).format(Math.abs(tx.amount))}
                      </td>
                    </tr>
                  );
                })}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-white px-5 py-3">
            <span className="text-sm text-[var(--color-muted-foreground)]">
              Showing{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {Math.min(pagination.totalCount, (pagination.currentPage - 1) * pagination.pageSize + 1)}–{Math.min(pagination.totalCount, pagination.currentPage * pagination.pageSize)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[var(--color-foreground)]">{pagination.totalCount}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", (pagination.currentPage - 1).toString());
                  startTransition(() => router.replace(`${pathname}?${params.toString()}`));
                }}
                disabled={pagination.currentPage <= 1 || isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-panel)] disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", (pagination.currentPage + 1).toString());
                  startTransition(() => router.replace(`${pathname}?${params.toString()}`));
                }}
                disabled={pagination.currentPage * pagination.pageSize >= pagination.totalCount || isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-panel)] disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
