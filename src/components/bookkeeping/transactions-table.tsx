"use client";
import { Fragment, useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { CheckCircle2, Search, Trash2, Sparkles, Loader2, X, ChevronDown, ChevronRight, ListCollapse, ListFilter, ChevronLeft } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { CategoryRule, TransactionRecord } from "@/lib/domain/types";
import { resolveCategoryWithConfidence } from "@/lib/categories/suggester";
import { TransactionRowComponent, fmtAmount, fmtDate } from "./transaction-row";
import {
  updateTransactionCategoryAction,
  bulkUpdateTransactionCategoryAction,
  updateCategoryAllowabilityAction,
  deleteTransactionsAction,
  createMerchantRuleAction,
  saveAiLearnedRulesAction,
} from "@/app/actions/bookkeeping";
import {
  buildCategoryRuleMap,
  classifyTransaction,
} from "@/lib/accounting/classifier";


/**
 * Words that appear constantly across unrelated bank statement entries
 * and carry zero identifying signal.
 */
const NOISE_TOKENS = new Set([
  // Transfer types
  "bacs", "chaps", "faster", "payment", "payments", "transfer", "direct",
  "debit", "credit", "standing", "order", "refund", "receipt", "salary",
  // Prepositions / connectives that end up in descriptions
  "from", "via", "for", "ref", "reference", "invoice", "number", "date",
  // Corporate suffixes
  "ltd", "limited", "plc", "inc", "llp", "llc", "corp", "group", "services",
  // Country noise
  "uk", "gb", "eur", "europe",
  // Misc
  "the", "and",
]);

/**
 * Breaks a merchant / description string into meaningful identifier tokens.
 * Pure numbers and short/noise words are excluded. What remains is the
 * "fingerprint" words that actually identify the counterparty.
 *
 * Examples:
 *   "FASTER PAYMENT FROM JOHN SMITH"  → ["john", "smith"]
 *   "JOHN SMITH REF 123456"           → ["john", "smith"]
 *   "BACS JOHN SMITH"                 → ["john", "smith"]
 *   "PayPal *JANE DOE"                → ["paypal", "jane"]
 *   "AMAZON MARKETPLACE UK"           → ["amazon", "marketplace"]
 */
function merchantTokens(s: string): Set<string> {
  const words = s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // strip punctuation
    .split(/\s+/)
    .filter(
      (t) =>
        t.length >= 4 &&        // at least 4 chars
        !/^\d+$/.test(t) &&     // not a pure number
        !NOISE_TOKENS.has(t),   // not a noise word
    );
  return new Set(words);
}

/**
 * Returns the number of shared identifier tokens between two strings.
 * > 0 means at least one meaningful word (person name, company name, etc.)
 * is the same → strong signal that they're the same counterparty.
 */
function sharedTokenCount(a: string, b: string): number {
  const ta = merchantTokens(a);
  const tb = merchantTokens(b);
  let shared = 0;
  for (const token of ta) {
    if (tb.has(token)) shared++;
  }
  return shared;
}

/**
 * Used only for the "Remember for future" rule — returns the most compact
 * clean name for a merchant by stripping payment-processor artifacts.
 */
function normalizeMerchant(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s*\*\s*.+$/, "")         // "PayPal *MERCHANT" → "paypal"
    .replace(/\s+[a-z0-9]{6,}$/i, "")  // trailing alphanumeric ref codes
    .replace(/\s+#[\w-]+$/i, "")       // trailing #REF123
    .replace(/\s+\d{4,}$/i, "")        // trailing 4+ digit numbers
    .trim();
}

interface Props {
  transactions: TransactionRecord[];
  categoryRules: CategoryRule[];
  pickerCategoryRules: CategoryRule[];
  vatRegistered: boolean;
  canUseAi?: boolean;
  anomalies?: Record<string, { reason: string; severity: "warning" | "info"; expectedAvg: number; currency: string }>;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
  };
}

export function TransactionsTable({
  transactions,
  categoryRules,
  pickerCategoryRules,
  vatRegistered,
  canUseAi = false,
  anomalies = {},
  pagination,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
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
    merchantName: string;
    merchantDesc: string;
    matches: TransactionRecord[];
  } | null>(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApplying, setBulkApplying] = useState(false);
  const [rememberRule, setRememberRule] = useState(true);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  const categoryRuleMap = useMemo(() => buildCategoryRuleMap(categoryRules), [categoryRules]);

  const rowsWithCategory = useMemo(
    () =>
      localTransactions.map((tx) => {
        const override = categoryOverrides[tx.id];
        const { category: resolved, confidence } = resolveCategoryWithConfidence(
          { ...tx, category: override ?? tx.category },
          categoryRules,
        );
        const resolvedCategory = resolved ?? "";
        const categoryConfidence = override
          ? "manual"
          : confidence;
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
          supportsAllowability: classification.supportsAllowability,
          taxTreatment: classification.effectiveTaxTreatment,
          categoryConfidence,
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
        (tx.runName || "").toLowerCase().includes(q) ||
        (tx.employee || "").toLowerCase().includes(q) ||
        (tx.resolvedCategory || "").toLowerCase().includes(q) ||
        (tx.accountType || "").toLowerCase().includes(q) ||
        (tx.statementType || "").toLowerCase().includes(q)
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

  const handleSaveCategory = useCallback(async (txId: string, newCategory: string) => {
    if (!newCategory) {
      setEditingId(null);
      return;
    }
    
    setSaving(txId);
    try {
      await updateTransactionCategoryAction(txId, newCategory);
      setCategoryOverrides((prev) => ({ ...prev, [txId]: newCategory }));
      setSavedId(txId);
      setTimeout(() => setSavedId((id) => (id === txId ? null : id)), 2000);

      // Similarity check — token overlap across merchant + description so that
      // "FASTER PAYMENT FROM JOHN SMITH", "BACS JOHN SMITH REF123", and
      // "JOHN SMITH PAYMENT" all match each other via shared tokens ["john","smith"].
      const sourceTx = rowsWithCategory.find((t) => t.id === txId);
      if (sourceTx) {
        // Silently learn from this categorisation in the background — fire-and-forget
        // so every user's manual categorisations feed the shared rule library,
        // making future imports smarter without any AI credit spend.
        createMerchantRuleAction(sourceTx.merchant, newCategory, sourceTx.description).catch(
          () => {},
        );

        // Combine merchant + description for richer token extraction
        const sourceText = `${sourceTx.merchant} ${sourceTx.description}`;

        const similar = rowsWithCategory.filter((tx) => {
          if (tx.id === txId) return false;
          if (tx.resolvedCategory === newCategory) return false;

          const txText = `${tx.merchant} ${tx.description}`;
          return sharedTokenCount(sourceText, txText) > 0;
        });

        if (similar.length > 0) {
          setBulkPrompt({
            originalTxId: txId,
            category: newCategory,
            merchantName: sourceTx.merchant,
            merchantDesc: sourceTx.description,
            matches: similar,
          });
          setBulkSelectedIds(new Set(similar.map((t) => t.id)));
          setRememberRule(true);
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
  }, [rowsWithCategory, bulkPrompt]);

  async function handleApplyBulk() {
    if (!bulkPrompt) return;
    setBulkApplying(true);
    try {
      const idsToUpdate = Array.from(bulkSelectedIds);
      const tasks: Promise<unknown>[] = [];

      if (idsToUpdate.length > 0) {
        tasks.push(bulkUpdateTransactionCategoryAction(idsToUpdate, bulkPrompt.category));
      }

      // Optionally save a merchant → category rule for future imports.
      // Build the pattern from the shared tokens so it fires on any variant
      // of the merchant name (e.g. "john smith" catches all BACS/FP variants).
      if (rememberRule && bulkPrompt.merchantName) {
        const tokens = Array.from(
          merchantTokens(`${bulkPrompt.merchantName} ${bulkPrompt.merchantDesc ?? ""}`),
        );
        // Use tokens as the rule name if we have them; fall back to normalised string
        const cleanMerchant =
          tokens.length > 0
            ? tokens.slice(0, 3).join(" ") // e.g. "john smith"
            : normalizeMerchant(bulkPrompt.merchantName) || bulkPrompt.merchantName;
        tasks.push(createMerchantRuleAction(cleanMerchant, bulkPrompt.category));
      }

      await Promise.all(tasks);

      if (idsToUpdate.length > 0) {
        const nextOverrides = { ...categoryOverrides };
        for (const id of idsToUpdate) {
          nextOverrides[id] = bulkPrompt.category;
        }
        setCategoryOverrides(nextOverrides);
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
        await deleteTransactionsAction(ids);
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

      // Log reasons for debugging
      console.log("[AI Scan Results]", results.map(r => `${r.id}: ${r.category ?? "NONE"} - ${r.reason}`));

      // Apply categories + save learned rules in parallel
      const payloadById = new Map(payload.map((p) => [p.id, p]));

      await Promise.allSettled([
        // Persist each category to the DB
        ...validResults.map((r) => updateTransactionCategoryAction(r.id, r.category!)),
        // Save AI results as learned rules so future imports skip the AI entirely
        saveAiLearnedRulesAction(
          validResults.map((r) => ({
            merchant: payloadById.get(r.id)?.merchant ?? "",
            description: payloadById.get(r.id)?.description ?? "",
            category: r.category!,
          })),
        ),
      ]);

      // Update UI optimistically
      const newOverrides = { ...categoryOverrides };
      for (const r of validResults) {
        newOverrides[r.id] = r.category!;
      }
      setCategoryOverrides(newOverrides);

      if (validResults.length < payload.length) {
        setAiSuccessMsg(`AI mapped ${validResults.length} of ${payload.length} items. Check console for details on skipped items.`);
      } else {
        setAiSuccessMsg(`Successfully categorised all ${validResults.length} items.`);
      }
      setTimeout(() => setAiSuccessMsg(null), 6000);

    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI auto-categorisation failed.");
    } finally {
      setAiCategorising(false);
    }
  }

  const handleToggleAllowable = useCallback(async (category: string, currentVal: boolean) => {
    if (!category) return;
    const newVal = !currentVal;
    
    // Optimistic update
    setAllowabilityOverrides((prev) => ({ ...prev, [category]: newVal }));
    
    try {
      await updateCategoryAllowabilityAction(category, newVal);
    } catch {
      // Revert if failed
      setAllowabilityOverrides((prev) => ({ ...prev, [category]: currentVal }));
    }
  }, []);

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

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

        {/* AI Categorise Button — owner/admin only */}
        <div className="ml-auto">
          {canUseAi && filtered.some((tx) => !tx.resolvedCategory || tx.resolvedCategory === "Uncategorised") && (
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
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 shadow-sm">
          <span className="text-sm font-bold text-indigo-700">
            {selected.size} selected
          </span>
          <div className="h-6 w-px bg-indigo-200 mx-1" />
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Bulk Category:</span>
            <select
              onChange={async (e) => {
                const category = e.target.value;
                if (!category) return;
                const ids = Array.from(selected);
                setBulkApplying(true);
                try {
                  await bulkUpdateTransactionCategoryAction(ids, category);
                  const nextOverrides = { ...categoryOverrides };
                  for (const id of ids) nextOverrides[id] = category;
                  setCategoryOverrides(nextOverrides);
                  setSelected(new Set());
                } finally {
                  setBulkApplying(false);
                }
              }}
              disabled={bulkApplying}
              className="h-8 rounded-lg border border-indigo-200 bg-white px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose category…</option>
              {pickerCategoryRules.map((rule) => (
                <option key={rule.slug} value={rule.category}>{rule.category}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {bulkApplying && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={deleting || bulkApplying}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? "Deleting…" : `Delete ${selected.size}`}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
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
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)] xs:table-cell">
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
                      {!isCollapsed && group.rows.map((tx) => (
                        <TransactionRowComponent
                          key={tx.id}
                          tx={tx}
                          isSelected={selected.has(tx.id)}
                          toggleRow={toggleRow}
                          isEditing={editingId === tx.id}
                          isSaving={saving === tx.id}
                          justSaved={savedId === tx.id}
                          editValue={editValue}
                          setEditingId={setEditingId}
                          setEditValue={setEditValue}
                          handleSaveCategory={handleSaveCategory}
                          handleToggleAllowable={handleToggleAllowable}
                          categoryOptions={pickerCategoryRules}
                          anomaly={anomalies[tx.id]}
                          confidence={tx.categoryConfidence}
                        />
                      ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {pagination && (
        <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-white px-6 py-4">
          <div className="text-sm text-[var(--color-muted-foreground)]">
            Showing <span className="font-medium">{Math.min(pagination.totalCount, (pagination.currentPage - 1) * pagination.pageSize + 1)}</span> to{" "}
            <span className="font-medium">{Math.min(pagination.totalCount, pagination.currentPage * pagination.pageSize)}</span> of{" "}
            <span className="font-medium">{pagination.totalCount}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", (pagination.currentPage - 1).toString());
                startTransition(() => {
                  router.replace(`${pathname}?${params.toString()}`);
                });
              }}
              disabled={pagination.currentPage <= 1 || isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", (pagination.currentPage + 1).toString());
                startTransition(() => {
                  router.replace(`${pathname}?${params.toString()}`);
                });
              }}
              disabled={pagination.currentPage * pagination.pageSize >= pagination.totalCount || isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
                You categorised a transaction as{" "}
                <span className="font-semibold text-black">{bulkPrompt.category}</span>. We found{" "}
                <span className="font-semibold text-black">{bulkPrompt.matches.length}</span> other
                transactions from the same merchant. Apply the same category to them?
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

            <div className="border-t border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-4">
              {/* Remember rule toggle */}
              <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
                <input
                  type="checkbox"
                  checked={rememberRule}
                  onChange={(e) => setRememberRule(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-indigo-600"
                />
                <div>
                  <p className="text-sm font-semibold text-indigo-800">
                    Remember for future imports
                  </p>
                  <p className="text-xs text-indigo-600">
                    Automatically categorise transactions containing{" "}
                    <span className="font-medium">
                      {(() => {
                        const tokens = Array.from(
                          merchantTokens(`${bulkPrompt.merchantName} ${bulkPrompt.merchantDesc ?? ""}`),
                        );
                        return tokens.length > 0
                          ? tokens.slice(0, 3).join(" ")
                          : normalizeMerchant(bulkPrompt.merchantName) || bulkPrompt.merchantName;
                      })()}
                    </span>{" "}
                    as <span className="font-medium">{bulkPrompt.category}</span> on future imports.
                  </p>
                </div>
              </label>

              <div className="flex items-center justify-end gap-3">
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
        </div>
      )}
    </div>
  );
}
