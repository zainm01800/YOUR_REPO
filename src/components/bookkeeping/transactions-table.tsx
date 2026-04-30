"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Layers3,
  Search,
  Tag,
  WalletCards,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CategoryRule, TransactionRecord } from "@/lib/domain/types";
import { categorySection } from "@/lib/categories/sections";
import {
  buildDuplicateCounts,
  getDuplicateKey,
  getTransactionHealth,
  type TransactionHealthTone,
} from "@/lib/bookkeeping/transaction-health";
import { fmtDate } from "./transaction-row";
import {
  bulkUpdateTransactionCategoryAction,
  updateTransactionCategoryAction,
} from "@/app/actions/bookkeeping";

interface Props {
  transactions: TransactionRecord[];
  categoryRules: CategoryRule[];
  pickerCategoryRules: CategoryRule[];
  vatRegistered: boolean;
  canUseAi?: boolean;
  canManageOperationalData?: boolean;
  stats: {
    totalCount: number;
    categorisedCount: number;
    uncategorisedCount: number;
    pnlCount: number;
    balanceSheetCount: number;
    equityCount: number;
  };
  totalIn: number;
  totalOut: number;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
  };
}

type TypeFilter = "all" | "income" | "expense";
type ReviewFilter = "all" | "needs_review" | "ready";

interface BulkPrompt {
  merchant: string;
  txIds: string[];
  category: string;
}

const HEALTH_CLASSES: Record<TransactionHealthTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  muted: "border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-muted-foreground)]",
};

const STOP_WORDS = new Set([
  "the",
  "ltd",
  "limited",
  "inc",
  "plc",
  "co",
  "and",
  "of",
  "for",
  "a",
  "an",
]);

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

interface CategoryPickerProps {
  sections: Map<string, CategoryRule[]>;
  value: string;
  onSelect: (category: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function CategoryPicker({ sections, value, onSelect, onCancel, isSaving }: CategoryPickerProps) {
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 256) });
  }, []);

  useEffect(() => {
    if (!pos) return;
    const input = wrapperRef.current?.querySelector("input");
    input?.focus();
  }, [pos]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      onCancel();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onCancel]);

  useEffect(() => {
    function reposition() {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 256) });
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, []);

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
    let count = 0;
    for (const rules of filtered.values()) count += rules.length;
    return count;
  }, [filtered]);

  const dropdown =
    pos &&
    createPortal(
      <div
        ref={dropdownRef}
        style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
        className="max-h-72 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white shadow-2xl"
      >
        {isSaving ? (
          <div className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">Saving...</div>
        ) : totalMatches === 0 ? (
          <div className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
            No categories match "{search}"
          </div>
        ) : (
          <>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect("");
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-foreground)]"
            >
              Clear category (Uncategorised)
            </button>
            {Array.from(filtered.entries()).map(([section, rules]) => (
              <div key={section}>
                <div className="sticky top-0 bg-[var(--color-panel)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  {section}
                </div>
                {rules.map((rule) => (
                  <button
                    key={rule.slug}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect(rule.category);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition hover:bg-[var(--color-accent-soft)] ${
                      value === rule.category
                        ? "bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent)]"
                        : "text-[var(--color-foreground)]"
                    }`}
                  >
                    {value === rule.category && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                    )}
                    {rule.category}
                  </button>
                ))}
              </div>
            ))}
          </>
        )}
      </div>,
      document.body,
    );

  return (
    <>
      <div ref={wrapperRef} className="flex items-center gap-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="h-7 w-48 rounded-lg border border-[var(--color-accent)] bg-white pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="h-7 rounded-lg border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)]"
        >
          x
        </button>
      </div>
      {dropdown}
    </>
  );
}

export function TransactionsTable({
  transactions,
  categoryRules,
  pickerCategoryRules,
  vatRegistered,
  stats,
  totalIn,
  totalOut,
  pagination,
  canManageOperationalData = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [localTransactions, setLocalTransactions] = useState(transactions);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState<TypeFilter>("all");
  const [filterReview, setFilterReview] = useState<ReviewFilter>("all");
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bulkPrompt, setBulkPrompt] = useState<BulkPrompt | null>(null);
  const [bulkApplying, setBulkApplying] = useState(false);

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  const duplicateCounts = useMemo(() => buildDuplicateCounts(localTransactions), [localTransactions]);

  const rowsWithCategory = useMemo(
    () =>
      localTransactions.map((tx) => {
        const override = categoryOverrides[tx.id];
        const transaction = { ...tx, category: override ?? tx.category };
        const health = getTransactionHealth(transaction, categoryRules, {
          vatRegistered,
          duplicateCount: duplicateCounts.get(getDuplicateKey(transaction)) ?? 0,
        });
        return { ...transaction, resolvedCategory: health.resolvedCategory, health };
      }),
    [localTransactions, categoryRules, categoryOverrides, vatRegistered, duplicateCounts],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rowsWithCategory.filter((tx) => {
      if (filterType === "income" && tx.amount < 0) return false;
      if (filterType === "expense" && tx.amount >= 0) return false;
      if (filterReview === "needs_review" && tx.health.status !== "needs_review") return false;
      if (filterReview === "ready" && tx.health.status !== "ready") return false;
      if (filterCategory !== "all") {
        const cat = tx.resolvedCategory || "Uncategorised";
        if (filterCategory === "uncategorised" ? cat !== "Uncategorised" : cat !== filterCategory) {
          return false;
        }
      }
      if (!q) return true;
      return (
        (tx.merchant || "").toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q) ||
        (tx.resolvedCategory || "").toLowerCase().includes(q)
      );
    });
  }, [rowsWithCategory, search, filterCategory, filterType, filterReview]);

  const monthGroups = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; income: number; expense: number; rows: typeof filtered }
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
      const normalized = cat.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(cat);
      }
    }
    return result.sort((a, b) => a.localeCompare(b));
  }, [rowsWithCategory]);

  const uniquePickerRules = useMemo(() => {
    const seen = new Set<string>();
    return pickerCategoryRules.filter((rule) => {
      const key = rule.category.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [pickerCategoryRules]);

  const pickerSections = useMemo(() => {
    const map = new Map<string, CategoryRule[]>();
    for (const rule of uniquePickerRules) {
      const section = categorySection(rule);
      const current = map.get(section) ?? [];
      current.push(rule);
      map.set(section, current);
    }
    return map;
  }, [uniquePickerRules]);

  const categorySectionLookup = useMemo(() => {
    return new Map(
      [...pickerCategoryRules, ...categoryRules].map((rule) => [rule.category, categorySection(rule)]),
    );
  }, [pickerCategoryRules, categoryRules]);

  const handleSaveCategory = useCallback(
    async (txId: string, newCategory: string) => {
      if (!newCategory) {
        setEditingId(null);
        return;
      }

      setSaving(txId);
      setSaveError(null);
      try {
        const result = await updateTransactionCategoryAction(txId, newCategory);
        if (result && result.error) throw new Error(result.error);

        setLocalTransactions((prev) =>
          prev.map((tx) => (tx.id === txId ? { ...tx, category: newCategory } : tx)),
        );
        setCategoryOverrides((prev) => ({ ...prev, [txId]: newCategory }));
        setSavedId(txId);
        setTimeout(() => setSavedId((id) => (id === txId ? null : id)), 2000);

        const savedTx = localTransactions.find((t) => t.id === txId);
        if (savedTx?.merchant) {
          const savedTokens = merchantTokens(savedTx.merchant);
          if (savedTokens.size > 0) {
            const similar = localTransactions.filter((other) => {
              if (other.id === txId) return false;
              const otherCat = categoryOverrides[other.id] ?? other.category ?? "";
              if (otherCat && otherCat.toLowerCase() === newCategory.toLowerCase()) return false;
              const otherTokens = merchantTokens(other.merchant || other.description || "");
              const shared = sharedTokenCount(savedTokens, otherTokens);
              const minTokens = Math.min(2, savedTokens.size, otherTokens.size);
              return shared > 0 && shared >= minTokens;
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
      const result = await bulkUpdateTransactionCategoryAction(
        bulkPrompt.txIds,
        bulkPrompt.category,
      );
      if (result && result.error) throw new Error(result.error);

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
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(n);

  const net = totalIn - totalOut;
  const incomeCount = filtered.filter((tx) => tx.amount >= 0).length;
  const expenseCount = filtered.length - incomeCount;
  const visibleNeedsReview = filtered.filter((tx) => tx.health.status === "needs_review").length;
  const visibleReady = filtered.filter((tx) => tx.health.status === "ready").length;

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-[var(--line)] bg-white p-4 shadow-[var(--shadow-sm)]">
        <div className="mb-4 grid gap-4 lg:grid-cols-5">
          {[
            {
              label: "Visible lines",
              value: filtered.length.toString(),
              sub: `${incomeCount} income / ${expenseCount} expenses`,
              icon: Layers3,
            },
            {
              label: "Uncategorised",
              value: stats.uncategorisedCount.toString(),
              sub: "These still need a bookkeeping category.",
              icon: Tag,
            },
            {
              label: "Needs review",
              value: visibleNeedsReview.toString(),
              sub: `${visibleReady} visible transaction${visibleReady !== 1 ? "s" : ""} look ready.`,
              icon: Tag,
            },
            {
              label: "Money in",
              value: fmt(totalIn),
              sub: "Across imported statement activity",
              icon: WalletCards,
            },
            {
              label: "Money out",
              value: fmt(totalOut),
              sub: "Potential expenses and balance sheet movements",
              icon: WalletCards,
            },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl bg-[var(--panel-2)] px-4 py-4">
              <div className="flex items-center gap-2">
                <card.icon className="h-4 w-4 text-[var(--accent-ink)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-2)]">
                  {card.label}
                </span>
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                {card.value}
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{card.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white pl-9 pr-4 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          >
            <option value="all">All categories</option>
            <option value="uncategorised">Uncategorised</option>
            {uniqueCategories
              .filter((c) => c !== "Uncategorised")
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
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

          <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-1">
            {[
              ["all", "All status"],
              ["needs_review", "Needs review"],
              ["ready", "Ready"],
            ].map(([value, label]) => {
              const active = filterReview === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilterReview(value as ReviewFilter)}
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
      </div>

      {!canManageOperationalData && (
        <div className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
          You currently have read-only access in this workspace. Transactions can be reviewed
          here, but only operational roles can change categories.
        </div>
      )}

      {saveError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{saveError}</span>
          <button type="button" onClick={() => setSaveError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {bulkPrompt && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Copy className="h-4 w-4 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">Similar transactions detected</p>
              <p className="mt-0.5 text-sm text-amber-800">
                We found <span className="font-semibold">{bulkPrompt.txIds.length}</span> other
                transaction{bulkPrompt.txIds.length !== 1 ? "s" : ""} from{" "}
                <span className="font-semibold">{bulkPrompt.merchant}</span> that
                {bulkPrompt.txIds.length !== 1 ? " do not" : " does not"} have the same category.
                Apply <span className="font-semibold">"{bulkPrompt.category}"</span> to{" "}
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
                {bulkApplying ? "Applying..." : `Yes, apply to ${bulkPrompt.txIds.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "TOTAL IN", value: fmt(totalIn), color: "text-emerald-600" },
          { label: "TOTAL OUT", value: fmt(totalOut), color: "text-[var(--color-danger)]" },
          {
            label: "NET",
            value: fmt(net),
            color: net >= 0 ? "text-emerald-600" : "text-[var(--color-danger)]",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-5 shadow-[var(--shadow-sm)]"
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                {s.label}
              </span>
            </div>
            <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead>
              <tr className="bg-[var(--color-panel)] text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Review status</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">VAT</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-sm text-[var(--color-muted-foreground)]"
                  >
                    No transactions match your filters.
                  </td>
                </tr>
              ) : (
                monthGroups.map((group) => (
                  <Fragment key={group.label}>
                    <tr className="bg-[#f6f4ee]">
                      <td colSpan={7} className="px-5 py-3">
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

                    {group.rows.map((tx) => {
                      const isIncome = tx.amount >= 0;
                      const isEditing = editingId === tx.id;
                      const isSaving = saving === tx.id;
                      const justSaved = savedId === tx.id;
                      const sectionLabel = tx.resolvedCategory
                        ? categorySectionLookup.get(tx.resolvedCategory) ?? "Other & Special"
                        : "Needs Review";

                      return (
                        <tr key={tx.id} className="transition-colors hover:bg-[var(--color-panel)]/50">
                          <td className="whitespace-nowrap px-5 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                            {fmtDate(tx.transactionDate, "short")}
                          </td>

                          <td className="max-w-xs px-5 py-3.5">
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

                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex max-w-[190px] items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${HEALTH_CLASSES[tx.health.tone]}`}
                              title={tx.health.detail}
                            >
                              {tx.health.label}
                            </span>
                            {tx.health.issues.length > 1 ? (
                              <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">
                                +{tx.health.issues.length - 1} more check{tx.health.issues.length - 1 !== 1 ? "s" : ""}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-5 py-3.5">
                            {isEditing && canManageOperationalData ? (
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
                                  if (!canManageOperationalData) return;
                                  setEditingId(tx.id);
                                  setEditValue(tx.resolvedCategory || "");
                                }}
                                disabled={!canManageOperationalData}
                                className={`max-w-[240px] rounded-lg border px-2.5 py-1 text-left text-xs font-medium transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] ${
                                  justSaved
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : tx.resolvedCategory
                                      ? "border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-foreground)]"
                                      : "border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)] italic"
                                } ${!canManageOperationalData ? "cursor-default hover:border-[var(--color-border)] hover:text-inherit" : ""}`}
                              >
                                <span className="block truncate">
                                  {tx.resolvedCategory || "Uncategorised"}
                                </span>
                                <span className="mt-0.5 block truncate text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                                  {sectionLabel}
                                </span>
                              </button>
                            )}
                          </td>

                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                                isIncome
                                  ? "text-emerald-600"
                                  : "text-[var(--color-muted-foreground)]"
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

                          <td className="px-5 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                            {tx.vatCode || "-"}
                          </td>

                          <td
                            className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold tabular-nums ${
                              isIncome ? "text-emerald-600" : "text-[var(--color-danger)]"
                            }`}
                          >
                            {isIncome ? "+" : "-"}
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

        {pagination && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-white px-5 py-3">
            <span className="text-sm text-[var(--color-muted-foreground)]">
              Showing{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {Math.min(pagination.totalCount, (pagination.currentPage - 1) * pagination.pageSize + 1)}
                -
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
