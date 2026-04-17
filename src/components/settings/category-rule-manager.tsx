"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Eye, EyeOff, Loader2, Plus, Search, Trash2 } from "lucide-react";
import type { AccountType, CategoryRule, CategorySection, StatementType, TaxTreatment } from "@/lib/domain/types";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_COLORS,
  STATEMENT_TYPE_LABELS,
  TAX_TREATMENT_LABELS,
} from "@/lib/accounting/classifier";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { buildMasterCategoryLibrary } from "@/lib/accounting/default-categories";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES: AccountType[] = ["income", "expense", "asset", "liability", "equity"];
const STATEMENT_TYPES: StatementType[] = ["p_and_l", "balance_sheet", "equity_movement", "tax_control"];
const CATEGORY_SECTIONS: CategorySection[] = [
  "Income",
  "Cost of Sales",
  "Travel & Vehicle",
  "Office & Admin",
  "Marketing & Sales",
  "Financial / Finance Costs",
  "Staff & Payroll",
  "Property & Premises",
  "Tax & Compliance",
  "Equity & Owner Items",
  "Assets, Liabilities & Transfers",
  "Other & Special",
];
const TAX_TREATMENTS: TaxTreatment[] = [
  "standard_rated", "reduced_rated", "zero_rated", "exempt",
  "outside_scope", "no_vat", "reverse_charge", "non_recoverable",
];

// Suggested reporting buckets for quick entry
const SUGGESTED_BUCKETS = [
  "Income",
  "Motor Expenses",
  "Admin & Office Expenses",
  "Marketing & Sales",
  "Finance Charges",
  "Fixed Assets",
  "Loans",
  "Drawings",
  "Capital",
  "Other Expenses",
];

function slugifyCategory(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function newRule(): CategoryRule {
  return {
    id: `cat_${Date.now()}`,
    category: "",
    slug: `custom-${Date.now()}`,
    description: "",
    section: "Other & Special",
    supplierPattern: "",
    keywordPattern: "",
    priority: 100,
    accountType: "expense",
    statementType: "p_and_l",
    reportingBucket: "Other Expenses",
    defaultTaxTreatment: "standard_rated",
    defaultVatRate: 20,
    defaultVatRecoverable: true,
    glCode: "",
    isSystemDefault: false,
    isActive: true,
    isVisible: true,
    allowableForTax: true,
    allowablePercentage: 100,
    sortOrder: Date.now(),
  };
}

type AllowableMode = "fully" | "partial" | "none";
type StatusFilter = "all" | "active" | "inactive" | "visible" | "hidden";

function toAllowableMode(rule: CategoryRule): AllowableMode {
  if (!rule.allowableForTax) return "none";
  if (rule.allowablePercentage < 100) return "partial";
  return "fully";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CategoryRuleManager({ initialRules }: { initialRules: CategoryRule[] }) {
  const [rules, setRules] = useState<CategoryRule[]>(() =>
    (initialRules.length > 0 ? [...initialRules] : buildMasterCategoryLibrary())
      .sort((a, b) => a.sortOrder - b.sortOrder || a.priority - b.priority),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const { toast } = useToast();
  const [showPresets, setShowPresets] = useState(false);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState<"all" | CategorySection>("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState<"all" | AccountType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  function addRule() {
    const r = { ...newRule(), priority: (rules.length + 1) * 10, sortOrder: rules.length + 1 };
    setRules((prev) => [...prev, r]);
    setExpandedId(r.id);
    setSaveStatus("idle");
  }

  function loadPresets() {
    setRules(buildMasterCategoryLibrary());
    setSaveStatus("idle");
    setShowPresets(false);
  }

  function updateRule(id: string, patch: Partial<CategoryRule>) {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (patch.category !== undefined && !next.isSystemDefault) {
          next.slug = slugifyCategory(patch.category) || next.slug;
        }
        return next;
      }),
    );
    setSaveStatus("idle");
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    setSaveStatus("idle");
  }

  function handleSave() {
    startTransition(async () => {
      const res = await fetch("/api/settings/category-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: rules
            .map((rule, index) => ({ ...rule, sortOrder: index + 1 }))
            .sort((a, b) => a.sortOrder - b.sortOrder || a.priority - b.priority),
        }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        toast({ variant: "success", title: "Category rules saved" });
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
        toast({ variant: "error", title: "Save failed", description: "Could not save category rules." });
      }
    });
  }

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules
      .filter((rule) => {
        if (sectionFilter !== "all" && rule.section !== sectionFilter) return false;
        if (accountTypeFilter !== "all" && rule.accountType !== accountTypeFilter) return false;
        if (statusFilter === "active" && !rule.isActive) return false;
        if (statusFilter === "inactive" && rule.isActive) return false;
        if (statusFilter === "visible" && !rule.isVisible) return false;
        if (statusFilter === "hidden" && rule.isVisible) return false;
        if (!q) return true;
        return [
          rule.category,
          rule.slug,
          rule.section,
          rule.reportingBucket,
          rule.glCode ?? "",
          rule.description ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.priority - b.priority || a.category.localeCompare(b.category));
  }, [rules, search, sectionFilter, accountTypeFilter, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Category library</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Manage the master bookkeeping category library for this workspace. Activate, hide, and customise the categories that should appear across categorisation, review, and reporting.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPresets(true)}
          className="shrink-0 rounded-xl border border-dashed border-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition"
        >
          Reset to master library
        </button>
      </div>

      {/* Preset confirm banner */}
      {showPresets && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <span className="text-amber-800">This will replace the current workspace category setup with the built-in master library and starter visibility defaults. Are you sure?</span>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={loadPresets}
              className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
            >
              Yes, reset library
            </button>
            <button
              type="button"
              onClick={() => setShowPresets(false)}
              className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories, GL codes, or sections"
            className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </label>
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value as "all" | CategorySection)}
          className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="all">All sections</option>
          {CATEGORY_SECTIONS.map((section) => (
            <option key={section} value={section}>{section}</option>
          ))}
        </select>
        <select
          value={accountTypeFilter}
          onChange={(e) => setAccountTypeFilter(e.target.value as "all" | AccountType)}
          className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="all">All account types</option>
          {ACCOUNT_TYPES.map((type) => (
            <option key={type} value={type}>{ACCOUNT_TYPE_LABELS[type]}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="all">All visibility states</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
        <span>{rules.length} total categories</span>
        <span>{rules.filter((rule) => rule.isActive).length} active</span>
        <span>{rules.filter((rule) => rule.isVisible).length} visible in dropdowns</span>
        <span>{filteredRules.length} shown by current filters</span>
      </div>

      {filteredRules.length === 0 ? (
        <p className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm text-[var(--color-muted-foreground)]">
          No categories match these filters. Try widening the search or reset to the built-in master library.
        </p>
      ) : (
        <div className="space-y-2">
          {filteredRules.map((rule) => {
            const isExpanded = expandedId === rule.id;
            return (
              <div
                key={rule.id}
                className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white"
              >
                {/* Row header (always visible) */}
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[var(--color-accent-soft)] transition"
                  onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                >
                  {/* Account type badge */}
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${ACCOUNT_TYPE_COLORS[rule.accountType]}`}>
                    {ACCOUNT_TYPE_LABELS[rule.accountType]}
                  </span>
                    {/* Allowable badge (only for P&L expenses) */}
                    {rule.accountType === "expense" && rule.statementType === "p_and_l" && (
                      <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold sm:inline-flex ${
                        !rule.allowableForTax
                          ? "bg-red-50 text-red-600"
                          : rule.allowablePercentage < 100
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {!rule.allowableForTax ? "Non-allowable" : rule.allowablePercentage < 100 ? `${rule.allowablePercentage}% allowable` : "Allowable"}
                      </span>
                    )}
                  {/* Category name */}
                  <span className="flex-1 truncate font-medium text-[var(--color-foreground)]">
                    {rule.category || <span className="italic text-[var(--color-muted-foreground)]">Unnamed category</span>}
                  </span>
                  <span className="hidden rounded-full bg-[var(--color-panel)] px-2 py-0.5 text-xs text-[var(--color-muted-foreground)] md:inline-flex">
                    {rule.section}
                  </span>
                  {/* Reporting bucket */}
                  <span className="hidden truncate text-xs text-[var(--color-muted-foreground)] sm:block max-w-[120px]">
                    {rule.reportingBucket}
                  </span>
                  {/* Statement */}
                  <span className="hidden text-xs text-[var(--color-muted-foreground)] md:block">
                    {STATEMENT_TYPE_LABELS[rule.statementType]}
                  </span>
                  {/* Tax */}
                  <span className="hidden text-xs text-[var(--color-muted-foreground)] lg:block">
                    {TAX_TREATMENT_LABELS[rule.defaultTaxTreatment]}
                    {rule.defaultVatRate > 0 ? ` (${rule.defaultVatRate}%)` : ""}
                  </span>
                  <span className={`hidden text-xs font-medium lg:block ${rule.isVisible ? "text-emerald-600" : "text-[var(--color-muted-foreground)]"}`}>
                    {rule.isVisible ? "Visible" : "Hidden"}
                  </span>
                  {/* Expand indicator */}
                  <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>

                {/* Expanded edit form */}
                {isExpanded && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-panel)] p-4 space-y-4">
                    {/* Row 1: name, slug, section, active / visible */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Category name *</span>
                        <input
                          value={rule.category}
                          onChange={(e) => updateRule(rule.id, { category: e.target.value })}
                          placeholder="e.g. Fuel"
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Slug</span>
                        <input
                          value={rule.slug}
                          onChange={(e) => updateRule(rule.id, { slug: slugifyCategory(e.target.value) })}
                          placeholder="e.g. fuel"
                          disabled={rule.isSystemDefault}
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Section *</span>
                        <select
                          value={rule.section}
                          onChange={(e) => updateRule(rule.id, { section: e.target.value as CategorySection })}
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        >
                          {CATEGORY_SECTIONS.map((section) => (
                            <option key={section} value={section}>{section}</option>
                          ))}
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-3 pt-5">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rule.isActive}
                            onChange={(e) => updateRule(rule.id, { isActive: e.target.checked })}
                            className="h-4 w-4 rounded accent-[var(--color-accent)]"
                          />
                          <span className="text-sm font-medium">Active</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rule.isVisible}
                            onChange={(e) => updateRule(rule.id, { isVisible: e.target.checked })}
                            className="h-4 w-4 rounded accent-[var(--color-accent)]"
                          />
                          <span className="text-sm font-medium">Visible</span>
                        </label>
                      </div>
                    </div>

                    {/* Row 2: description, GL, priority, sort */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="space-y-1 sm:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Description</span>
                        <input
                          value={rule.description ?? ""}
                          onChange={(e) => updateRule(rule.id, { description: e.target.value })}
                          placeholder="Short explanation for finance users"
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">GL / Nominal code</span>
                        <input
                          value={rule.glCode ?? ""}
                          onChange={(e) => updateRule(rule.id, { glCode: e.target.value })}
                          placeholder="e.g. 5100"
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Priority</span>
                          <input
                            type="number"
                            value={rule.priority}
                            onChange={(e) => updateRule(rule.id, { priority: Number(e.target.value) })}
                            min={1} max={999}
                            className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Sort</span>
                          <input
                            type="number"
                            value={rule.sortOrder}
                            onChange={(e) => updateRule(rule.id, { sortOrder: Number(e.target.value) })}
                            min={1} max={9999}
                            className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Row 3: Account type, Statement type, Reporting bucket */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Account type *</span>
                        <select
                          value={rule.accountType}
                          onChange={(e) => {
                            const accountType = e.target.value as AccountType;
                            // Auto-set statement type when account type changes
                            const autoStatement: Record<AccountType, StatementType> = {
                              income: "p_and_l",
                              expense: "p_and_l",
                              asset: "balance_sheet",
                              liability: "balance_sheet",
                              equity: "equity_movement",
                            };
                            updateRule(rule.id, { accountType, statementType: autoStatement[accountType] });
                          }}
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        >
                          {ACCOUNT_TYPES.map((t) => (
                            <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Financial statement *</span>
                        <select
                          value={rule.statementType}
                          onChange={(e) => updateRule(rule.id, { statementType: e.target.value as StatementType })}
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        >
                          {STATEMENT_TYPES.map((t) => (
                            <option key={t} value={t}>{STATEMENT_TYPE_LABELS[t]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Reporting bucket *</span>
                        <input
                          list="bucket-list"
                          value={rule.reportingBucket}
                          onChange={(e) => updateRule(rule.id, { reportingBucket: e.target.value })}
                          placeholder="e.g. Motor Expenses"
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        />
                        <datalist id="bucket-list">
                          {SUGGESTED_BUCKETS.map((b) => <option key={b} value={b} />)}
                        </datalist>
                      </label>
                    </div>

                    {/* Row 3: Tax treatment, VAT rate, VAT recoverable */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Default tax treatment</span>
                        <select
                          value={rule.defaultTaxTreatment}
                          onChange={(e) => updateRule(rule.id, { defaultTaxTreatment: e.target.value as TaxTreatment })}
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        >
                          {TAX_TREATMENTS.map((t) => (
                            <option key={t} value={t}>{TAX_TREATMENT_LABELS[t]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Default VAT rate (%)</span>
                        <input
                          type="number"
                          value={rule.defaultVatRate}
                          onChange={(e) => updateRule(rule.id, { defaultVatRate: Number(e.target.value) })}
                          min={0} max={100} step={0.1}
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        />
                      </label>
                      <label className="flex items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          checked={rule.defaultVatRecoverable}
                          onChange={(e) => updateRule(rule.id, { defaultVatRecoverable: e.target.checked })}
                          className="h-4 w-4 rounded accent-[var(--color-accent)]"
                        />
                        <span className="text-sm font-medium">VAT recoverable</span>
                      </label>
                    </div>

                    {/* Row 4: Allowable for tax (only shown for P&L expenses) */}
                    {rule.accountType === "expense" && rule.statementType === "p_and_l" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Allowable for tax</span>
                          <select
                            value={toAllowableMode(rule)}
                            onChange={(e) => {
                              const mode = e.target.value as AllowableMode;
                              if (mode === "none") {
                                updateRule(rule.id, { allowableForTax: false, allowablePercentage: 0 });
                              } else if (mode === "partial") {
                                updateRule(rule.id, { allowableForTax: true, allowablePercentage: 50 });
                              } else {
                                updateRule(rule.id, { allowableForTax: true, allowablePercentage: 100 });
                              }
                            }}
                            className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          >
                            <option value="fully">Fully allowable (100%)</option>
                            <option value="partial">Partially allowable</option>
                            <option value="none">Not allowable (0%)</option>
                          </select>
                        </div>
                        {rule.allowableForTax && rule.allowablePercentage < 100 && (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Allowable percentage (%)</span>
                            <input
                              type="number"
                              value={rule.allowablePercentage}
                              onChange={(e) => updateRule(rule.id, { allowablePercentage: Math.min(100, Math.max(0, Number(e.target.value))) })}
                              min={0} max={100} step={1}
                              className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Row 5: Pattern matching */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Supplier pattern (regex)</span>
                        <input
                          value={rule.supplierPattern ?? ""}
                          onChange={(e) => updateRule(rule.id, { supplierPattern: e.target.value })}
                          placeholder="bp|shell|esso"
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Keyword pattern (regex)</span>
                        <input
                          value={rule.keywordPattern ?? ""}
                          onChange={(e) => updateRule(rule.id, { keywordPattern: e.target.value })}
                          placeholder="fuel|petrol|diesel"
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        />
                      </label>
                    </div>

                    {/* Delete button */}
                    <div className="flex justify-end pt-1">
                      {rule.isSystemDefault ? (
                        <button
                          type="button"
                          onClick={() => updateRule(rule.id, { isActive: false, isVisible: false })}
                          className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-white transition"
                        >
                          {rule.isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {rule.isVisible ? "Hide category" : "Keep hidden"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { removeRule(rule.id); setExpandedId(null); }}
                          className="flex items-center gap-1.5 rounded-xl border border-[var(--color-danger-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove custom category
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={addRule}
          className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition"
        >
          <Plus className="h-4 w-4" />
          Add category
        </button>

        <div className="flex items-center gap-3">
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm font-medium text-[var(--color-danger)]">Save failed</span>
          )}
          <Button type="button" onClick={handleSave} disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save all categories
          </Button>
        </div>
      </div>

      {/* Help text */}
      <div className="rounded-2xl bg-[var(--color-panel)] p-4 text-xs text-[var(--color-muted-foreground)] space-y-1.5">
        <p className="font-semibold text-[var(--color-foreground)]">Accounting notes</p>
        <p><strong>Active</strong> categories can be auto-suggested and used operationally. <strong>Visible</strong> categories appear in normal dropdowns and review pickers.</p>
        <p><strong>Account type</strong> determines whether a transaction is income, an expense, an asset acquisition, a liability, or an equity movement.</p>
        <p><strong>Financial statement</strong> determines where it appears: P&amp;L (income + expenses), Balance Sheet (assets + liabilities), Equity (drawings, capital), or Tax Control.</p>
        <p><strong>Tax treatment</strong> drives the VAT split. For non-VAT-registered businesses, set to <em>No VAT</em> or use the workspace toggle in Settings.</p>
        <p><strong>Drawings</strong> and <strong>Capital Introduced</strong> are equity movements — they do not appear on the P&amp;L.</p>
        <p><strong>Loan repayments</strong> reduce a liability — they are <em>not</em> an expense. The interest portion should be a separate expense category.</p>
        <p><strong>Allowable for tax</strong> controls whether an expense reduces taxable profit. Non-allowable expenses (e.g. parking fines, client entertainment) appear in the P&amp;L but are added back in the tax calculation. Partially allowable expenses (e.g. 50% private use) are split accordingly.</p>
      </div>
    </div>
  );
}
