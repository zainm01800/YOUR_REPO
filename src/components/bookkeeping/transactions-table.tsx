"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Search, Tag, Trash2 } from "lucide-react";
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
  allCategories: string[];
  vatRegistered: boolean;
}

export function TransactionsTable({
  transactions,
  categoryRules,
  allCategories,
  vatRegistered,
}: Props) {
  const [localTransactions, setLocalTransactions] = useState(transactions);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        const classification = classifyTransaction(tx, resolvedRule, vatRegistered);

        return {
          ...tx,
          resolvedCategory,
          accountType: classification.accountType,
          statementType: classification.statementType,
          taxTreatment: classification.effectiveTaxTreatment,
        };
      }),
    [localTransactions, categoryRules, categoryOverrides, categoryRuleMap, vatRegistered],
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

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    for (const tx of rowsWithCategory) {
      set.add(tx.resolvedCategory || "Uncategorised");
    }
    return Array.from(set).sort();
  }, [rowsWithCategory]);

  async function handleSaveCategory(txId: string, newCategory: string) {
    setSaving(txId);
    try {
      await fetch(`/api/bookkeeping/transactions/${txId}/category`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory || null }),
      });
      setCategoryOverrides((prev) => ({ ...prev, [txId]: newCategory }));
      setSavedId(txId);
      setTimeout(() => setSavedId((id) => (id === txId ? null : id)), 2000);
    } catch {
      // keep current optimistic feel for now
    } finally {
      setSaving(null);
      setEditingId(null);
    }
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
      </div>

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
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]"
                  >
                    No transactions match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((tx, i) => {
                  const isEditing = editingId === tx.id;
                  const isSaving = saving === tx.id;
                  const justSaved = savedId === tx.id;
                  const isSelected = selected.has(tx.id);

                  return (
                    <tr
                      key={tx.id}
                      className={`${i > 0 ? "border-t border-[var(--color-border)]" : ""} transition ${isSelected ? "bg-red-50" : "hover:bg-[var(--color-accent-soft)]"}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(tx.id)}
                          className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">
                        {fmtDate(tx.transactionDate)}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">
                        {tx.merchant}
                      </td>
                      <td className="hidden max-w-[220px] px-4 py-3 text-[var(--color-muted-foreground)] sm:table-cell">
                        <span className="line-clamp-1">{tx.description}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-[var(--color-foreground)]">
                        {fmtAmount(tx.amount, tx.currency)}
                        {tx.currency !== "GBP" && (
                          <span className="ml-1 text-xs font-normal text-[var(--color-muted-foreground)]">
                            {tx.currency}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              handleSaveCategory(tx.id, editValue);
                            }}
                            className="flex items-center gap-1"
                          >
                            <input
                              list={`cat-list-${tx.id}`}
                              autoFocus
                              value={editValue}
                              onChange={(event) => setEditValue(event.target.value)}
                              placeholder="Category…"
                              className="h-7 w-36 rounded-lg border border-[var(--color-accent)] bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                            />
                            <datalist id={`cat-list-${tx.id}`}>
                              {allCategories.map((category) => (
                                <option key={category} value={category} />
                              ))}
                            </datalist>
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
                      <td className="hidden px-4 py-3 lg:table-cell">
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
                      <td className="hidden px-4 py-3 text-xs text-[var(--color-muted-foreground)] xl:table-cell">
                        {TAX_TREATMENT_LABELS[
                          tx.taxTreatment as keyof typeof TAX_TREATMENT_LABELS
                        ] ?? "Unknown"}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-[var(--color-muted-foreground)] md:table-cell">
                        {tx.runName}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-[var(--color-muted-foreground)] lg:table-cell">
                        {tx.employee || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
