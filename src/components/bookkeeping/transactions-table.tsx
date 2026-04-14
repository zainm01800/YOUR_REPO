"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Search, Tag, Trash2, Sparkles, Loader2, X, ChevronDown, ChevronRight, ListCollapse, ListFilter } from "lucide-react";
import type { CategoryRule, TransactionRecord } from "@/lib/domain/types";
import { resolveCategory } from "@/lib/categories/suggester";
import {
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_TYPE_LABELS,
  TAX_TREATMENT_LABELS,
  buildCategoryRuleMap,
  classifyTransaction,
} from "@/lib/accounting/classifier";

interface TransactionRow extends TransactionRecord {
  runName: string;
  runId: string;
  period?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  CHF: "Fr",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
};

function fmtAmount(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${sym}${Math.abs(amount).toFixed(2)}`;
}

function fmtDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface Props {
  transactions: TransactionRow[];
  categoryRules: CategoryRule[];
  visibleCategories: string[];
  vatRegistered: boolean;
}

export function TransactionsTable({
  transactions,
  categoryRules,
  visibleCategories,
  vatRegistered,
}: Props) {
  const router = useRouter();
  const [localTransactions, setLocalTransactions] = useState(transactions);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [allowabilityOverrides, setAllowabilityOverrides] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [aiCategorising, setAiCategorising] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  const [bulkPrompt, setBulkPrompt] = useState<{
    originalTxId: string;
    category: string;
    matches: TransactionRow[];
  } | null>(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApplying, setBulkApplying] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  const categoryRuleMap = useMemo(() => buildCategoryRuleMap(categoryRules), [categoryRules]);

  const rowsWithCategory = useMemo(
    () =>
      localTransactions.map((tx) => {
        const resolvedCategory =
          categoryOverrides[tx.id] ??
          tx.category ??
          resolveCategory(tx, categoryRules) ??
          "";
        const resolvedRule = resolvedCategory ? categoryRuleMap.get(resolvedCategory) : undefined;
        // Optimistically apply override, fall back to rule, default to true
        const isAllowable = resolvedCategory 
          ? (allowabilityOverrides[resolvedCategory] ?? resolvedRule?.allowableForTax ?? true)
          : true;

        const classification = classifyTransaction(tx, resolvedRule, vatRegistered);

        return {
          ...tx,
          resolvedCategory,
          allowableForTax: isAllowable,
          accountType: classification.accountType,
          statementType: classification.statementType,
          taxTreatment: classification.effectiveTaxTreatment,
        };
      }),
    [localTransactions, categoryRules, categoryOverrides, allowabilityOverrides, categoryRuleMap, vatRegistered],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rowsWithCategory.filter((tx) => {
      if (filterCategory !== "all") {
        const cat = tx.resolvedCategory || "Uncategorised";
        if (filterCategory === "uncategorised" ? cat !== "Uncategorised" : cat !== filterCategory) {
          return false;
        }
      }
      if (!q) return true;
      return (
        tx.merchant.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q) ||
        tx.runName.toLowerCase().includes(q) ||
        (tx.employee || "").toLowerCase().includes(q) ||
        (tx.resolvedCategory || "").toLowerCase().includes(q) ||
        tx.accountType.toLowerCase().includes(q) ||
        tx.statementType.toLowerCase().includes(q)
      );
    });
  }, [rowsWithCategory, search, filterCategory]);

  const monthGroups = useMemo(() => {
    const map = new Map<string, { label: string; rows: (typeof rowsWithCategory)[0][] }>();
    
    // Assumes filtered is already sorted by date descending from the page loader
    for (const tx of filtered) {
      const date = tx.transactionDate ? new Date(tx.transactionDate) : null;
      const key = date && !isNaN(date.getTime()) 
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : "no-date";
      
      const label = date && !isNaN(date.getTime())
        ? date.toLocaleString("en-GB", { month: "long", year: "numeric" })
        : "No Date";

      if (!map.has(key)) {
        map.set(key, { label, rows: [] });
      }
      map.get(key)!.rows.push(tx);
    }
    
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // Expand latest month by default if not manually toggled yet
  useEffect(() => {
    if (monthGroups.length > 0 && collapsedMonths.size === 0) {
      // If we have groups, collapse all EXCEPT the first one (latest)
      const toCollapse = new Set<string>();
      monthGroups.slice(1).forEach(([key]) => toCollapse.add(key));
      setCollapsedMonths(toCollapse);
    }
  }, [monthGroups.length > 0]); // only run once when data loads

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    for (const tx of rowsWithCategory) {
      set.add(tx.resolvedCategory || "Uncategorised");
    }
    return Array.from(set).sort();
  }, [rowsWithCategory]);

  async function handleSaveCategory(txId: string, newCategory: string) {
    if (!newCategory) {
      setEditingId(null);
      return;
    }
    
    setSaving(txId);
    try {
      await fetch(`/api/bookkeeping/transactions/${txId}/category`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
      });
      setCategoryOverrides((prev) => ({ ...prev, [txId]: newCategory }));
      setSavedId(txId);
      router.refresh();
      setTimeout(() => setSavedId((id) => (id === txId ? null : id)), 2000);

      // Similarity check logic
      const sourceTx = rowsWithCategory.find((t) => t.id === txId);
      if (sourceTx) {
        const sourceMerchant = sourceTx.merchant.toLowerCase().trim();
        const sourceDesc = sourceTx.description.toLowerCase().trim();

        const similar = rowsWithCategory.filter((tx) => {
          if (tx.id === txId) return false;
          if (tx.resolvedCategory === newCategory) return false;

          const tm = tx.merchant.toLowerCase().trim();
          const td = tx.description.toLowerCase().trim();

          return (tm && tm === sourceMerchant) || (td && td === sourceDesc);
        });

        if (similar.length > 0) {
          setBulkPrompt({
            originalTxId: txId,
            category: newCategory,
            matches: similar,
          });
          setBulkSelectedIds(new Set(similar.map((t) => t.id)));
          setEditingId(null);
          setSaving(null);
          return;
        }
      }
    } catch {
      // Optimistic failure
    } finally {
      if (!bulkPrompt) {
        setSaving(null);
        setEditingId(null);
      }
    }
  }

  async function handleApplyBulk() {
    if (!bulkPrompt) return;
    setBulkApplying(true);
    try {
      const idsToUpdate = Array.from(bulkSelectedIds);
      if (idsToUpdate.length > 0) {
        await Promise.allSettled(
          idsToUpdate.map(async (id) => {
            await fetch(`/api/bookkeeping/transactions/${id}/category`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ category: bulkPrompt.category }),
            });
          })
        );
        const nextOverrides = { ...categoryOverrides };
        for (const id of idsToUpdate) {
          nextOverrides[id] = bulkPrompt.category;
        }
        setCategoryOverrides(nextOverrides);
        router.refresh();
      }
      setBulkPrompt(null);
    } finally {
      setBulkApplying(false);
    }
  }

  function handleCancelBulk() {
    setBulkPrompt(null);
  }

  function handleDeleteSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} transaction${ids.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    startDelete(async () => {
      setDeleteError(null);
      try {
        const res = await fetch("/api/bookkeeping/transactions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null) as { error?: string } | null;
          throw new Error(payload?.error ?? "Could not delete transactions.");
        }
        setLocalTransactions((prev) => prev.filter((tx) => !ids.includes(tx.id)));
        setSelected(new Set());
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Could not delete transactions.");
      }
    });
  }

  async function handleAiCategorise() {
    // Find visibly uncategorised transactions
    const targets = filtered.filter(
      (tx) => !tx.resolvedCategory || tx.resolvedCategory === "Uncategorised"
    );

    if (targets.length === 0) return;

    setAiCategorising(true);
    setAiError(null);
    setAiSuccessMsg(null);

    try {
      const payload = targets.map((tx) => ({
        id: tx.id,
        merchant: tx.merchant,
        description: tx.description,
      }));

      const res = await fetch("/api/ai/categorise-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: payload }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "AI service failed");
      }

      const { results } = await res.json() as { results?: { id: string; category: string | null; reason: string }[] };
      if (!results || !Array.isArray(results)) {
        throw new Error("Invalid response from AI");
      }

      // Filter to only those where AI provided a valid mapped category
      const validResults = results.filter((r) => r.category && r.id);

      if (validResults.length === 0) {
        setAiSuccessMsg("AI could not confidently categorise any items.");
        setTimeout(() => setAiSuccessMsg(null), 4000);
        return;
      }

      // Parallel apply via existing row API endpoint
      await Promise.allSettled(
        validResults.map(async (r) => {
          await fetch(`/api/bookkeeping/transactions/${r.id}/category`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: r.category }),
          });
        })
      );

      // Update UI optimistically
      const newOverrides = { ...categoryOverrides };
      for (const r of validResults) {
        newOverrides[r.id] = r.category!;
      }
      setCategoryOverrides(newOverrides);

      setAiSuccessMsg(`Categorised ${validResults.length} transaction${validResults.length === 1 ? "" : "s"}.`);
      setTimeout(() => setAiSuccessMsg(null), 4000);

    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI auto-categorisation failed.");
    } finally {
      setAiCategorising(false);
    }
  }

  async function handleToggleAllowable(category: string, currentVal: boolean) {
    if (!category) return;
    const newVal = !currentVal;
    
    // Optimistic update
    setAllowabilityOverrides((prev) => ({ ...prev, [category]: newVal }));
    
    try {
      const res = await fetch(`/api/settings/category-rules/${encodeURIComponent(category)}/allowability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowableForTax: newVal }),
      });
      if (!res.ok) {
        throw new Error("Failed to update allowability");
      }
    } catch {
      // Revert if failed
      setAllowabilityOverrides((prev) => ({ ...prev, [category]: currentVal }));
    }
  }

  const allFilteredIds = useMemo(() => filtered.map((tx) => tx.id), [filtered]);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...allFilteredIds]));
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant, description, employee…"
            className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-10 appearance-none rounded-xl border border-[var(--color-border)] bg-white pl-4 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="all">All categories</option>
            <option value="uncategorised">Uncategorised</option>
            {uniqueCategories
              .filter((category) => category !== "Uncategorised")
              .map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
          </select>
        </div>
        <span className="text-sm text-[var(--color-muted-foreground)]">
          {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
        </span>

        {/* Group Controls */}
        <div className="flex items-center gap-1 border-l border-[var(--color-border)] pl-3">
          <button
            onClick={() => setCollapsedMonths(new Set())}
            title="Expand all months"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)] hover:text-black"
          >
            <ListFilter className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCollapsedMonths(new Set(monthGroups.map(([key]) => key)))}
            title="Collapse all months"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)] hover:text-black"
          >
            <ListCollapse className="h-4 w-4" />
          </button>
        </div>

        {/* AI Categorise Button */}
        <div className="ml-auto">
          {filtered.some((tx) => !tx.resolvedCategory || tx.resolvedCategory === "Uncategorised") && (
            <button
              type="button"
              onClick={handleAiCategorise}
              disabled={aiCategorising}
              className="group flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {aiCategorising ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-violet-200 transition group-hover:scale-110" />
                  Auto-categorise with AI
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {aiError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <p className="font-semibold">AI Categorisation failed</p>
          <p>{aiError}</p>
        </div>
      )}
      
      {aiSuccessMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          {aiSuccessMsg}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
          <span className="text-sm font-medium text-red-700">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? "Deleting…" : `Delete ${selected.size}`}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-red-600 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {deleteError && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{deleteError}</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-panel)]">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Merchant
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)] sm:table-cell">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Category
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)] lg:table-cell">
                  Account type
                </th>
                <th className="hidden px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)] xl:table-cell">
                  Allowable
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)] xl:table-cell">
                  Tax treatment
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)] md:table-cell">
                  Source
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)] lg:table-cell">
                  Employee
                </th>
              </tr>
            </thead>
            <tbody>
              {monthGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]"
                  >
                    No transactions match your filters.
                  </td>
                </tr>
              ) : (
                monthGroups.map(([monthKey, group]) => {
                  const isCollapsed = collapsedMonths.has(monthKey);
                  const toggleMonth = () => {
                    setCollapsedMonths(prev => {
                      const next = new Set(prev);
                      if (next.has(monthKey)) next.delete(monthKey);
                      else next.add(monthKey);
                      return next;
                    });
                  };

                  return (
                    <Fragment key={monthKey}>
                      {/* Month Header Row */}
                      <tr 
                        className="group/header sticky top-0 z-10 cursor-pointer border-b border-[var(--color-border)] bg-gray-50/80 backdrop-blur-sm transition hover:bg-gray-100"
                        onClick={toggleMonth}
                      >
                        <td className="px-4 py-2">
                          <button className="flex h-5 w-5 items-center justify-center rounded transition group-hover/header:bg-white">
                            {isCollapsed ? (
                              <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-indigo-600" />
                            )}
                          </button>
                        </td>
                        <td colSpan={10} className="px-2 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-foreground)]">
                              {group.label}
                            </span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[var(--color-muted-foreground)] shadow-sm border border-[var(--color-border)]">
                              {group.rows.length} items
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Transaction Rows */}
                      {!isCollapsed && group.rows.map((tx, i) => {
                        const isEditing = editingId === tx.id;
                        const isSaving = saving === tx.id;
                        const justSaved = savedId === tx.id;
                        const isSelected = selected.has(tx.id);
                        const categoryOptions = tx.resolvedCategory && !visibleCategories.includes(tx.resolvedCategory)
                          ? [...visibleCategories, tx.resolvedCategory].sort((a, b) => a.localeCompare(b))
                          : visibleCategories;

                        return (
                          <tr
                            key={tx.id}
                            className={`transition ${isSelected ? "bg-red-50" : "hover:bg-[var(--color-accent-soft)]"}`}
                          >
                            <td className="px-4 py-3 border-t border-[var(--color-border)]">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRow(tx.id)}
                                className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
                              />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)] border-t border-[var(--color-border)]">
                              {fmtDate(tx.transactionDate || "")}
                            </td>
                            <td className="px-4 py-3 font-medium text-[var(--color-foreground)] border-t border-[var(--color-border)]">
                              {tx.merchant}
                            </td>
                            <td className="hidden max-w-[220px] px-4 py-3 text-[var(--color-muted-foreground)] sm:table-cell border-t border-[var(--color-border)]">
                              <span className="line-clamp-1">{tx.description}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-[var(--color-foreground)] border-t border-[var(--color-border)]">
                              {fmtAmount(tx.amount, tx.currency)}
                              {tx.currency !== "GBP" && (
                                <span className="ml-1 text-xs font-normal text-[var(--color-muted-foreground)]">
                                  {tx.currency}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 border-t border-[var(--color-border)]">
                              {isEditing ? (
                                <form
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    handleSaveCategory(tx.id, editValue);
                                  }}
                                  className="flex items-center gap-1"
                                >
                                  <select
                                    autoFocus
                                    value={editValue}
                                    onChange={(event) => setEditValue(event.target.value)}
                                    className="h-7 w-36 rounded-lg border border-[var(--color-accent)] bg-white px-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                                  >
                                    <option value="" disabled>Select category…</option>
                                    {categoryOptions.map((category) => (
                                      <option key={category} value={category}>
                                        {category}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="h-7 rounded-lg bg-[var(--color-accent)] px-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                                  >
                                    {isSaving ? "…" : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="h-7 rounded-lg border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)]"
                                  >
                                    ✕
                                  </button>
                                </form>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(tx.id);
                                    setEditValue(tx.resolvedCategory || "");
                                  }}
                                  className="group flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition hover:bg-[var(--color-panel)]"
                                >
                                  {justSaved ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Tag className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-accent)]" />
                                  )}
                                  {tx.resolvedCategory ? (
                                    <span className="font-medium text-[var(--color-foreground)]">
                                      {tx.resolvedCategory}
                                    </span>
                                  ) : (
                                    <span className="italic text-[var(--color-muted-foreground)]">
                                      Uncategorised
                                    </span>
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="hidden px-4 py-3 lg:table-cell border-t border-[var(--color-border)]">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  ACCOUNT_TYPE_COLORS[
                                    tx.accountType as keyof typeof ACCOUNT_TYPE_COLORS
                                  ]
                                }`}
                              >
                                {ACCOUNT_TYPE_LABELS[
                                  tx.accountType as keyof typeof ACCOUNT_TYPE_LABELS
                                ] ?? tx.accountType}
                              </span>
                            </td>
                            <td className="hidden px-4 py-3 text-center xl:table-cell border-t border-[var(--color-border)]">
                              <input
                                type="checkbox"
                                checked={tx.allowableForTax}
                                disabled={!tx.resolvedCategory}
                                onChange={() => handleToggleAllowable(tx.resolvedCategory, !!tx.allowableForTax)}
                                className="h-4 w-4 cursor-pointer rounded border-[var(--color-border)] accent-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                                title={tx.resolvedCategory ? `Toggle allowability for all ${tx.resolvedCategory} items` : "Set a category first"}
                              />
                            </td>
                            <td className="hidden px-4 py-3 text-xs text-[var(--color-muted-foreground)] xl:table-cell border-t border-[var(--color-border)]">
                              {TAX_TREATMENT_LABELS[
                                tx.taxTreatment as keyof typeof TAX_TREATMENT_LABELS
                              ] ?? "Unknown"}
                            </td>
                            <td className="hidden px-4 py-3 text-xs text-[var(--color-muted-foreground)] md:table-cell border-t border-[var(--color-border)]">
                              {tx.runName}
                            </td>
                            <td className="hidden px-4 py-3 text-xs text-[var(--color-muted-foreground)] lg:table-cell border-t border-[var(--color-border)]">
                              {tx.employee || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Categorisation Prompt Modal */}
      {bulkPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-4">
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                Similar Transactions Detected
              </h2>
              <button
                onClick={handleCancelBulk}
                className="rounded-lg p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)] hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="px-6 py-5">
              <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
                You just categorised a transaction as <span className="font-semibold text-black">{bulkPrompt.category}</span>.
                We found <span className="font-semibold text-black">{bulkPrompt.matches.length}</span> other transactions that look identical. Would you like to apply the same category to them?
              </p>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="w-10 px-4 py-2">
                        <input
                          type="checkbox"
                          checked={bulkSelectedIds.size === bulkPrompt.matches.length && bulkPrompt.matches.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setBulkSelectedIds(new Set(bulkPrompt.matches.map(m => m.id)));
                            else setBulkSelectedIds(new Set());
                          }}
                          className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
                        />
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-[var(--color-muted-foreground)]">Date</th>
                      <th className="px-4 py-2 text-left font-medium text-[var(--color-muted-foreground)]">Merchant</th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--color-muted-foreground)]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPrompt.matches.map((match) => (
                      <tr key={match.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-accent-soft)]">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={bulkSelectedIds.has(match.id)}
                            onChange={(e) => {
                              setBulkSelectedIds(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(match.id);
                                else next.delete(match.id);
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-[var(--color-muted-foreground)]">
                          {fmtDate(match.transactionDate)}
                        </td>
                        <td className="px-4 py-2 font-medium text-[var(--color-foreground)]">
                          {match.merchant}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-mono font-semibold text-[var(--color-foreground)]">
                          {fmtAmount(match.amount, match.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-4">
              <button
                type="button"
                onClick={handleCancelBulk}
                className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-gray-50 hover:text-black"
              >
                Skip 
              </button>
              <button
                type="button"
                onClick={handleApplyBulk}
                disabled={bulkApplying || bulkSelectedIds.size === 0}
                className="flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {bulkApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Applying…
                  </>
                ) : (
                  `Apply to ${bulkSelectedIds.size}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
