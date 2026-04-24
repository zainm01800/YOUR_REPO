"use client";
import { Fragment, useEffect, useMemo, useRef, useState, useTransition, useCallback } from "react";
import { Search, Download, ChevronLeft, ChevronRight, X, Copy } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { CategoryRule, TransactionRecord } from "@/lib/domain/types";
import { resolveCategoryWithConfidence } from "@/lib/categories/suggester";
import { categorySection } from "@/lib/categories/sections";
import { fmtDate } from "./transaction-row";
import { updateTransactionCategoryAction } from "@/app/actions/bookkeeping";

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

interface BulkPrompt {
  merchant: string;
  txIds: string[];
  category: string;
}

// ─── Merchant token helpers ────────────────────────────────────────────────────
const STOP_WORDS = new Set(["the", "ltd", "limited", "inc", "plc", "co", "and", "of", "for", "a", "an"]);

function normalizeMerchant(m: string) {
  return m.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function merchantTokens(m: string): Set<string> {
  return new Set(
    normalizeMerchant(m)
      .split(" ")
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t)),
  );
}

function sharedTokenCount(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const token of a) {
    if (b.has(token)) count++;
  }
  return count;
}

// ─── Searchable category picker ───────────────────────────────────────────────
interface CategoryPickerProps {
  sections: Map<string, CategoryRule[]>;
  value: string;
  onSelect: (category: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function CategoryPicker({ sections, value, onSelect, onCancel, isSaving }: CategoryPickerProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onCancel]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return sections;
    const result = new Map<string, CategoryRule[]>();
    for (const [section, rules] of sections.entries()) {
      const matching = rules.filter((r) => r.category.toLowerCase().includes(q));
      if (matching.length > 0) result.set(section, matching);
    }
    return result;
  }, [sections, search]);

  const totalMatches = useMemo(() => {
    let n = 0;
    for (const rules of filtered.values()) n += rules.length;
    return n;
  }, [filtered]);

  return (
    <div ref={containerRef} className="relative z-50">
      {/* Search input */}
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="h-7 w-52 rounded-lg border border-[var(--color-accent)] bg-white pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="h-7 rounded-lg border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)]"
        >
          ✕
        </button>
      </div>

      {/* Dropdown list */}
      <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-64 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white shadow-xl">
        {isSaving ? (
          <div className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">Saving…</div>
        ) : totalMatches === 0 ? (
          <div className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">No categories match "{search}"</div>
        ) : (
          Array.from(filtered.entries()).map(([section, rules]) => (
            <div key={section}>
              <div className="sticky top-0 bg-[var(--color-panel)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                {section}
              </div>
              {rules.map((rule) => (
                <button
                  key={rule.slug}
                  type="button"
                  onClick={() => onSelect(rule.category)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--color-accent-soft)] ${
                    value === rule.category
                      ? "bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent)]"
                      : "text-[var(--color-foreground)]"
                  }`}
                >
                  {value === rule.category && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                  )}
                  {rule.category}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
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

  // Bulk duplicate prompt
  const [bulkPrompt, setBulkPrompt] = useState<BulkPrompt | null>(null);
  const [bulkApplying, setBulkApplying] = useState(false);

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
    const groups = new Map<string, { label: string; income: number; expense: number; rows: typeof filtered }>();
    for (const tx of filtered) {
      const date = tx.transactionDate ? new Date(tx.transactionDate) : null;
      const validDate = date && !Number.isNaN(date.getTime());
      const key = validDate
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        : "no-date";
      const label = validDate
        ? date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        : "No date";
      const group = groups.get(key) ?? { label, income: 0, expense: 0, rows: [] };
      if (tx.amount >= 0) group.income += tx.amount;
      else group.expense += Math.abs(tx.amount);
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

  const pickerSections = useMemo(() => {
    const map = new Map<string, CategoryRule[]>();
    for (const rule of uniquePickerRules) {
      const section = categorySection(rule);
      const existing = map.get(section) ?? [];
      existing.push(rule);
      map.set(section, existing);
    }
    return map;
  }, [uniquePickerRules]);

  const handleSaveCategory = useCallback(
    async (txId: string, newCategory: string) => {
      if (!newCategory) {
        setEditingId(null);
        return;
      }
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

        // ── Duplicate detection ──────────────────────────────────────────────
        const savedTx = localTransactions.find((t) => t.id === txId);
        if (savedTx?.merchant) {
          const savedTokens = merchantTokens(savedTx.merchant);
          if (savedTokens.size > 0) {
            const similar = localTransactions.filter((other) => {
              if (other.id === txId) return false;
              // Only prompt for uncategorised or differently categorised transactions
              const otherCat = categoryOverrides[other.id] ?? other.category ?? "";
              if (otherCat && otherCat.toLowerCase() === newCategory.toLowerCase()) return false;
              const otherTokens = merchantTokens(other.merchant || other.description || "");
              return sharedTokenCount(savedTokens, otherTokens) >= 2;
            });
            if (similar.length > 0) {
              setBulkPrompt({
                merchant: savedTx.merchant,
                txIds: similar.map((t) => t.id),
                category: newCategory,
              });
            }
          }
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Could not save category.");
      } finally {
        setSaving(null);
        setEditingId(null);
      }
    },
    [localTransactions, categoryOverrides],
  );

  const handleBulkApply = useCallback(async () => {
    if (!bulkPrompt) return;
    setBulkApplying(true);
    try {
      await Promise.all(
        bulkPrompt.txIds.map((id) => updateTransactionCategoryAction(id, bulkPrompt.category)),
      );
      setLocalTransactions((prev) =>
        prev.map((tx) =>
          bulkPrompt.txIds.includes(tx.id) ? { ...tx, category: bulkPrompt.category } : tx,
        ),
      );
      setCategoryOverrides((prev) => {
        const next = { ...prev };
        for (const id of bulkPrompt.txIds) next[id] = bulkPrompt.category;
        return next;
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not apply bulk category.");
    } finally {
      setBulkApplying(false);
      setBulkPrompt(null);
    }
  }, [bulkPrompt]);

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
      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
          />
        </div>

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

        <button
          type="button"
          onClick={exportCsv}
          className="ml-auto flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-panel)]"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {saveError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{saveError}</span>
          <button type="button" onClick={() => setSaveError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Bulk duplicate prompt ──────────────────────────────────────────── */}
      {bulkPrompt && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Copy className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                Similar transactions detected
              </p>
              <p className="mt-0.5 text-sm text-amber-800">
                We found{" "}
                <span className="font-semibold">{bulkPrompt.txIds.length}</span>{" "}
                other transaction{bulkPrompt.txIds.length !== 1 ? "s" : ""} from{" "}
                <span className="font-semibold">{bulkPrompt.merchant}</span> that
                {bulkPrompt.txIds.length !== 1 ? " don't" : " doesn't"} have the same
                category. Apply{" "}
                <span className="font-semibold">"{bulkPrompt.category}"</span> to{" "}
                {bulkPrompt.txIds.length !== 1 ? "all of them" : "it"} too?
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkPrompt(null)}
                disabled={bulkApplying}
                className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
              >
                No, skip
              </button>
              <button
                type="button"
                onClick={handleBulkApply}
                disabled={bulkApplying}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
              >
                {bulkApplying
                  ? "Applying…"
                  : `Yes, apply to ${bulkPrompt.txIds.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "TOTAL IN", value: fmt(totalIn), color: "text-emerald-600" },
          { label: "TOTAL OUT", value: fmt(totalOut), color: "text-[var(--color-danger)]" },
          { label: "NET", value: fmt(net), color: net >= 0 ? "text-emerald-600" : "text-[var(--color-danger)]" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-5">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                ✦ {s.label}
              </span>
            </div>
            <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
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
                    {/* Month header row */}
                    <tr className="bg-[#f6f4ee]">
                      <td colSpan={6} className="px-5 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                              {group.label}
                            </p>
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                              {group.rows.length} transaction{group.rows.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="rounded-full bg-white px-2.5 py-1 font-medium text-emerald-700 ring-1 ring-emerald-100">
                              In {fmt(group.income)}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 font-medium text-red-600 ring-1 ring-red-100">
                              Out {fmt(group.expense)}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Transaction rows */}
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
                            <span
                              className="block truncate font-medium text-[var(--color-foreground)]"
                              title={tx.merchant || tx.description}
                            >
                              {tx.merchant || tx.description}
                            </span>
                            {tx.merchant && tx.description && tx.description !== tx.merchant && (
                              <span
                                className="block truncate text-xs text-[var(--color-muted-foreground)]"
                                title={tx.description}
                              >
                                {tx.description}
                              </span>
                            )}
                          </td>

                          {/* Category — searchable picker */}
                          <td className="px-5 py-3.5">
                            {isEditing ? (
                              <CategoryPicker
                                sections={pickerSections}
                                value={editValue}
                                isSaving={isSaving}
                                onSelect={(cat) => {
                                  setEditValue(cat);
                                  handleSaveCategory(tx.id, cat);
                                }}
                                onCancel={() => setEditingId(null)}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(tx.id);
                                  setEditValue(tx.resolvedCategory || "");
                                }}
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
                            <span
                              className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                                isIncome ? "text-emerald-600" : "text-[var(--color-muted-foreground)]"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isIncome ? "bg-emerald-500" : "bg-[var(--color-muted-foreground)]"
                                }`}
                              />
                              {isIncome ? "Income" : "Expense"}
                            </span>
                          </td>

                          {/* VAT */}
                          <td className="px-5 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                            {tx.vatCode || "—"}
                          </td>

                          {/* Amount */}
                          <td
                            className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold tabular-nums ${
                              isIncome ? "text-emerald-600" : "text-[var(--color-danger)]"
                            }`}
                          >
                            {isIncome ? "+" : "−"}
                            {new Intl.NumberFormat("en-GB", {
                              style: "currency",
                              currency: tx.currency,
                            }).format(Math.abs(tx.amount))}
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

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {pagination && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-white px-5 py-3">
            <span className="text-sm text-[var(--color-muted-foreground)]">
              Showing{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {Math.min(
                  pagination.totalCount,
                  (pagination.currentPage - 1) * pagination.pageSize + 1,
                )}
                –
                {Math.min(pagination.totalCount, pagination.currentPage * pagination.pageSize)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {pagination.totalCount}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
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
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", (pagination.currentPage + 1).toString());
                  startTransition(() => router.replace(`${pathname}?${params.toString()}`));
                }}
                disabled={
                  pagination.currentPage * pagination.pageSize >= pagination.totalCount || isPending
                }
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
