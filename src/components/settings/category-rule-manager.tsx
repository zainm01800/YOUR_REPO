"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import type { AccountType, CategoryRule, StatementType, TaxTreatment } from "@/lib/domain/types";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_COLORS,
  STATEMENT_TYPE_LABELS,
  TAX_TREATMENT_LABELS,
} from "@/lib/accounting/classifier";
import { Button } from "@/components/ui/button";
import { DRIVING_SCHOOL_CATEGORIES } from "@/lib/accounting/default-categories";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES: AccountType[] = ["income", "expense", "asset", "liability", "equity"];
const STATEMENT_TYPES: StatementType[] = ["p_and_l", "balance_sheet", "equity_movement", "tax_control"];
const TAX_TREATMENTS: TaxTreatment[] = [
  "standard_rated", "reduced_rated", "zero_rated", "exempt",
  "outside_scope", "no_vat", "reverse_charge", "non_recoverable",
];

// Suggested reporting buckets for quick entry
const SUGGESTED_BUCKETS = [
  "Income",
  "Motor Expenses",
  "Admin & Office Expenses",
  "Finance Charges",
  "Fixed Assets",
  "Loans",
  "Drawings",
  "Capital",
  "Other Expenses",
];

function newRule(): CategoryRule {
  return {
    id: `cat_${Date.now()}`,
    category: "",
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
    isActive: true,
    allowableForTax: true,
    allowablePercentage: 100,
  };
}

type AllowableMode = "fully" | "partial" | "none";

function toAllowableMode(rule: CategoryRule): AllowableMode {
  if (!rule.allowableForTax) return "none";
  if (rule.allowablePercentage < 100) return "partial";
  return "fully";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CategoryRuleManager({ initialRules }: { initialRules: CategoryRule[] }) {
  const [rules, setRules] = useState<CategoryRule[]>(() =>
    [...initialRules].sort((a, b) => a.priority - b.priority),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [showPresets, setShowPresets] = useState(false);

  function addRule() {
    const r = { ...newRule(), priority: (rules.length + 1) * 10 };
    setRules((prev) => [...prev, r]);
    setExpandedId(r.id);
    setSaveStatus("idle");
  }

  function loadPresets() {
    setRules(DRIVING_SCHOOL_CATEGORIES.map((r) => ({ ...r })));
    setSaveStatus("idle");
    setShowPresets(false);
  }

  function updateRule(id: string, patch: Partial<CategoryRule>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
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
        body: JSON.stringify({ rules }),
      });
      setSaveStatus(res.ok ? "saved" : "error");
      if (res.ok) setTimeout(() => setSaveStatus("idle"), 3000);
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Category rules</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Define bookkeeping categories with full accounting metadata. Each category maps to the correct financial statement and tax treatment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPresets(true)}
          className="shrink-0 rounded-xl border border-dashed border-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition"
        >
          Load driving school presets
        </button>
      </div>

      {/* Preset confirm banner */}
      {showPresets && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <span className="text-amber-800">This will replace all current category rules with the driving school presets. Are you sure?</span>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={loadPresets}
              className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
            >
              Yes, load presets
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

      {rules.length === 0 ? (
        <p className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm text-[var(--color-muted-foreground)]">
          No categories defined. Add a category or load the driving school presets to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => {
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
                  {/* Expand indicator */}
                  <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>

                {/* Expanded edit form */}
                {isExpanded && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-panel)] p-4 space-y-4">
                    {/* Row 1: name, GL code, priority, active */}
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
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">GL / Nominal code</span>
                        <input
                          value={rule.glCode ?? ""}
                          onChange={(e) => updateRule(rule.id, { glCode: e.target.value })}
                          placeholder="e.g. 5100"
                          className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        />
                      </label>
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
                      <label className="flex items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          checked={rule.isActive}
                          onChange={(e) => updateRule(rule.id, { isActive: e.target.checked })}
                          className="h-4 w-4 rounded accent-[var(--color-accent)]"
                        />
                        <span className="text-sm font-medium">Active</span>
                      </label>
                    </div>

                    {/* Row 2: Account type, Statement type, Reporting bucket */}
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
                        <label className="space-y-1">
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
                        </label>
                        {rule.allowableForTax && rule.allowablePercentage < 100 && (
                          <label className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Allowable percentage (%)</span>
                            <input
                              type="number"
                              value={rule.allowablePercentage}
                              onChange={(e) => updateRule(rule.id, { allowablePercentage: Math.min(100, Math.max(0, Number(e.target.value))) })}
                              min={0} max={100} step={1}
                              className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                            />
                          </label>
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
                      <button
                        type="button"
                        onClick={() => { removeRule(rule.id); setExpandedId(null); }}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--color-danger-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove category
                      </button>
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
