"use client";

import { useMemo, useTransition } from "react";
import { CheckCircle2, Download, Info, MinusCircle, Wallet, XCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import type { PnLReport, VatReport } from "@/lib/accounting/reports";
import type { TaxSummaryReport, TaxAdjustment, TaxCategoryLine } from "@/lib/accounting/tax-summary";

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "GBP ",
  USD: "USD ",
  EUR: "EUR ",
  AUD: "AUD ",
  CAD: "CAD ",
};

function formatAmount(amount: number, currency: string) {
  const prefix = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${prefix}${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildCsv({
  taxSummary,
  selectedPeriod,
}: {
  taxSummary: TaxSummaryReport;
  selectedPeriod?: string;
}) {
  const rows: string[][] = [
    ["Tax Summary"],
    ["Period", selectedPeriod || "All periods"],
    ["Business type", taxSummary.businessType === "sole_trader" ? "Sole trader / self-employed" : "General small business"],
    ["Currency", taxSummary.currency],
    [],
    ["=== ACCOUNTING VIEW ==="],
    ["Total income", taxSummary.profitSummary.totalIncome.toFixed(2)],
    ["Total expenses (P&L)", taxSummary.profitSummary.totalExpenses.toFixed(2)],
    ["Accounting profit", taxSummary.profitSummary.accountingProfit.toFixed(2)],
    [],
    ["=== TAX VIEW ==="],
    ["Total claimable expenses", taxSummary.profitSummary.totalClaimableExpenses.toFixed(2)],
    ["Disallowed expenses (add-back)", taxSummary.profitSummary.disallowedExpenses.toFixed(2)],
    ["Taxable profit", taxSummary.profitSummary.taxableProfit.toFixed(2)],
    [],
    ["VAT Summary"],
    ["VAT enabled", taxSummary.vatSummary.enabled ? "Yes" : "No"],
    ["Output VAT", taxSummary.vatSummary.outputVat.toFixed(2)],
    ["Input VAT", taxSummary.vatSummary.inputVat.toFixed(2)],
    ["Non-recoverable VAT", taxSummary.vatSummary.nonRecoverableVat.toFixed(2)],
    ["Net VAT position", taxSummary.vatSummary.netVatPosition.toFixed(2)],
  ];

  if (taxSummary.estimatedTax) {
    rows.push(
      [],
      ["Estimated sole trader tax"],
      ["Tax year", taxSummary.estimatedTax.taxYearLabel],
      ["Taxable profit", taxSummary.estimatedTax.taxableProfitStartingPoint.toFixed(2)],
      ["Personal allowance used", taxSummary.estimatedTax.personalAllowanceUsed.toFixed(2)],
      ["Taxable income after allowance", taxSummary.estimatedTax.taxableIncomeAfterAllowance.toFixed(2)],
      ["Estimated income tax", taxSummary.estimatedTax.estimatedIncomeTax.toFixed(2)],
      ["Estimated National Insurance", taxSummary.estimatedTax.estimatedNationalInsurance.toFixed(2)],
      ["Total estimated tax", taxSummary.estimatedTax.totalEstimatedTax.toFixed(2)],
    );
  }

  if (taxSummary.partiallyClaimableCategories.length > 0) {
    rows.push([], ["Partially claimable expenses"], ["Category", "Accounting Amount", "Claimable", "Non-claimable", "% Claimable"]);
    for (const c of taxSummary.partiallyClaimableCategories) {
      rows.push([c.category, c.accountingAmount.toFixed(2), c.claimableAmount.toFixed(2), c.nonClaimableAmount.toFixed(2), `${c.allowablePercentage}%`]);
    }
  }

  if (taxSummary.nonClaimableCategories.length > 0) {
    rows.push([], ["Non-claimable expenses (add-backs)"], ["Category", "Amount"]);
    for (const c of taxSummary.nonClaimableCategories) {
      rows.push([c.category, c.nonClaimableAmount.toFixed(2)]);
    }
  }

  rows.push([], ["Assumptions"]);
  for (const assumption of taxSummary.assumptions) {
    rows.push([assumption]);
  }
  for (const assumption of taxSummary.estimatedTax?.assumptions ?? []) {
    rows.push([assumption]);
  }

  return rows
    .map((row) =>
      row
        .map((cell) => {
          const escaped = cell.replace(/"/g, '""');
          return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
        })
        .join(","),
    )
    .join("\n");
}

function downloadCsv(fileName: string, content: string) {
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "profit" | "expense" | "warning";
}) {
  const toneClass =
    tone === "profit"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "expense"
        ? "border-orange-200 bg-orange-50 text-orange-800"
        : tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-[var(--color-border)] bg-white text-[var(--color-foreground)]";

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold">{value}</p>
    </div>
  );
}

function TaxSection({
  title,
  rows,
  currency,
  footer,
}: {
  title: string;
  rows: Array<{ label: string; value: number; tone?: "default" | "strong" | "addition" | "deduction" }>;
  currency: string;
  footer?: { label: string; value: number };
}) {
  return (
    <Card className="space-y-0 overflow-hidden p-0">
      <div className="border-b border-[var(--color-border)] px-6 py-4 text-center">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-foreground)]">
          {title}
        </h2>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.label}
              className={index > 0 ? "border-t border-[var(--color-border)]" : ""}
            >
              <td className="px-6 py-3 text-[var(--color-foreground)]">{row.label}</td>
              <td
                className={`px-6 py-3 text-right font-mono ${
                  row.tone === "strong" ? "font-bold text-[var(--color-foreground)]"
                  : row.tone === "addition" ? "font-semibold text-amber-700"
                  : row.tone === "deduction" ? "font-semibold text-emerald-700"
                  : "text-[var(--color-foreground)]"
                }`}
              >
                {formatAmount(row.value, currency)}
              </td>
            </tr>
          ))}
          {footer ? (
            <tr className="border-t-2 border-[var(--color-foreground)] bg-[var(--color-panel)]">
              <td className="px-6 py-3 text-sm font-bold text-[var(--color-foreground)]">
                {footer.label}
              </td>
              <td className="px-6 py-3 text-right font-mono text-sm font-bold text-[var(--color-foreground)]">
                {formatAmount(footer.value, currency)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Card>
  );
}

function TaxCategoryTable({
  title,
  description,
  rows,
  currency,
  tone,
  showPercentage,
}: {
  title: string;
  description: string;
  rows: TaxCategoryLine[];
  currency: string;
  tone: "green" | "amber" | "red";
  showPercentage?: boolean;
}) {
  const icon =
    tone === "green" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    : tone === "amber" ? <MinusCircle className="h-4 w-4 text-amber-600" />
    : <XCircle className="h-4 w-4 text-red-500" />;

  const headerClass =
    tone === "green" ? "bg-emerald-50 text-emerald-800"
    : tone === "amber" ? "bg-amber-50 text-amber-800"
    : "bg-red-50 text-red-800";

  const accentClass =
    tone === "green" ? "text-emerald-700"
    : tone === "amber" ? "text-amber-700"
    : "text-red-600";

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-[var(--color-muted-foreground)]">{title}: None</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="space-y-0 overflow-hidden p-0">
      <div className={`border-b border-[var(--color-border)] px-5 py-3 ${headerClass}`}>
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="text-sm font-bold">{title}</h3>
            <p className="text-xs opacity-75">{description}</p>
          </div>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-panel)]">
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Category</th>
            <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Accounting</th>
            {showPercentage && (
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">% Claim</th>
            )}
            <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Claimable</th>
            {showPercentage && (
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Add-back</th>
            )}
            <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Txns</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.reportingBucket}-${row.category}`} className={index > 0 ? "border-t border-[var(--color-border)]" : ""}>
              <td className="px-4 py-3 text-[var(--color-foreground)]">{row.category}</td>
              <td className="px-4 py-3 text-right font-mono text-[var(--color-muted-foreground)]">{formatAmount(row.accountingAmount, currency)}</td>
              {showPercentage && (
                <td className="px-4 py-3 text-right font-mono text-[var(--color-muted-foreground)]">{row.allowablePercentage}%</td>
              )}
              <td className={`px-4 py-3 text-right font-mono font-semibold ${accentClass}`}>{formatAmount(row.claimableAmount, currency)}</td>
              {showPercentage && (
                <td className="px-4 py-3 text-right font-mono text-amber-600">+{formatAmount(row.nonClaimableAmount, currency)}</td>
              )}
              <td className="px-4 py-3 text-right font-mono text-[var(--color-muted-foreground)]">{row.transactionCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function CategoryBreakdown({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: Array<{ bucket: string; category: string; amount: number; count: number }>;
  currency: string;
}) {
  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          P&L view — all items regardless of tax claimability.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
          No categories available for this period.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-panel)]">
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Bucket</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Category</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Txns</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.bucket}-${row.category}`} className={index > 0 ? "border-t border-[var(--color-border)]" : ""}>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{row.bucket}</td>
                  <td className="px-4 py-3 text-[var(--color-foreground)]">{row.category}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-muted-foreground)]">{row.count}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-foreground)]">{formatAmount(row.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function TaxSummary({
  taxSummary,
  pnl,
  vatReport,
  periodOptions,
  selectedPeriod,
}: {
  taxSummary: TaxSummaryReport;
  pnl: PnLReport;
  vatReport: VatReport;
  periodOptions: string[];
  selectedPeriod?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const incomeRows = useMemo(
    () =>
      pnl.incomeSection.buckets.flatMap((bucket) =>
        bucket.lines.map((line) => ({
          bucket: bucket.bucket,
          category: line.category,
          amount: line.netAmount,
          count: line.transactionCount,
        })),
      ),
    [pnl],
  );

  const expenseRows = useMemo(
    () =>
      pnl.expenseSection.buckets.flatMap((bucket) =>
        bucket.lines.map((line) => ({
          bucket: bucket.bucket,
          category: line.category,
          amount: line.netAmount,
          count: line.transactionCount,
        })),
      ),
    [pnl],
  );

  function updatePeriod(period: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!period || period === "all") {
      params.delete("period");
    } else {
      params.set("period", period);
    }

    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  function exportSummary() {
    const content = buildCsv({ taxSummary, selectedPeriod });
    const suffix = selectedPeriod ? selectedPeriod.replace(/[^a-z0-9_-]+/gi, "-") : "all-periods";
    downloadCsv(`tax-summary-${suffix}.csv`, content);
  }

  const hasAdjustments =
    taxSummary.partiallyClaimableCategories.length > 0 ||
    taxSummary.nonClaimableCategories.length > 0;

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <Card className="space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              Tax summary
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">
              Accounting vs Tax view
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              The accounting view includes all P&L expenses. The tax view adjusts for non-claimable
              and partially claimable items, producing a separate taxable profit figure.
              Both figures are estimates — not filing outputs.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex flex-col gap-1 text-sm text-[var(--color-muted-foreground)]">
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">Period</span>
              <select
                value={selectedPeriod ?? "all"}
                onChange={(event) => updatePeriod(event.target.value)}
                disabled={isPending}
                className="h-11 min-w-[200px] rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)]"
              >
                <option value="all">All periods</option>
                {periodOptions.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={exportSummary}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-panel)]"
            >
              <Download className="h-4 w-4" />
              Export summary
            </button>
          </div>
        </div>

        {/* Top KPI cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total income"
            value={formatAmount(taxSummary.profitSummary.totalIncome, taxSummary.currency)}
            tone="profit"
          />
          <SummaryCard
            label="Accounting profit"
            value={formatAmount(taxSummary.profitSummary.accountingProfit, taxSummary.currency)}
            tone={taxSummary.profitSummary.accountingProfit >= 0 ? "profit" : "warning"}
          />
          <SummaryCard
            label="Taxable profit"
            value={formatAmount(taxSummary.profitSummary.taxableProfit, taxSummary.currency)}
            tone={taxSummary.profitSummary.taxableProfit >= 0 ? "profit" : "warning"}
          />
          <SummaryCard
            label="Estimated total tax"
            value={
              taxSummary.estimatedTax
                ? formatAmount(taxSummary.estimatedTax.totalEstimatedTax, taxSummary.currency)
                : "Not estimated"
            }
            tone={taxSummary.estimatedTax ? "warning" : "default"}
          />
        </div>
      </Card>

      {/* Main two-column layout */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        {/* LEFT: calculations */}
        <div className="space-y-6">
          {/* Section 1: Accounting Summary */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              1 · Accounting Summary
            </p>
            <TaxSection
              title="Profit & Loss (accounting view)"
              currency={taxSummary.currency}
              rows={[
                { label: "Total income", value: taxSummary.profitSummary.totalIncome },
                { label: "Total expenses (all)", value: taxSummary.profitSummary.totalExpenses },
                { label: "Accounting profit", value: taxSummary.profitSummary.accountingProfit, tone: "strong" },
              ]}
            />
          </div>

          {/* Section 2: Tax Adjustments */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              2 · Tax Adjustments
            </p>
            <TaxSection
              title="Taxable profit calculation"
              currency={taxSummary.currency}
              rows={[
                { label: "Accounting profit", value: taxSummary.profitSummary.accountingProfit },
                ...(hasAdjustments ? [
                  {
                    label: "Add: non-claimable expenses",
                    value: taxSummary.profitSummary.disallowedExpenses,
                    tone: "addition" as const,
                  },
                ] : []),
              ]}
              footer={{
                label: "Taxable profit",
                value: taxSummary.profitSummary.taxableProfit,
              }}
            />

            {!hasAdjustments && (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                ✓ All categorised P&L expenses are fully claimable — no add-backs required.
              </div>
            )}
          </div>

          {/* VAT Summary */}
          <TaxSection
            title="VAT summary"
            currency={taxSummary.currency}
            rows={
              taxSummary.vatSummary.enabled
                ? [
                    { label: "Output VAT", value: taxSummary.vatSummary.outputVat },
                    { label: "Input VAT", value: taxSummary.vatSummary.inputVat },
                    { label: "Non-recoverable VAT", value: taxSummary.vatSummary.nonRecoverableVat },
                  ]
                : [{ label: "VAT registration disabled", value: 0 }]
            }
            footer={
              taxSummary.vatSummary.enabled
                ? {
                    label: taxSummary.vatSummary.netVatPosition >= 0 ? "Net VAT due" : "Net VAT reclaimable",
                    value: Math.abs(taxSummary.vatSummary.netVatPosition),
                  }
                : undefined
            }
          />

          {/* Section 3: Estimated tax */}
          {taxSummary.estimatedTax ? (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                3 · Estimated Tax ({taxSummary.estimatedTax.taxYearLabel})
              </p>
              <TaxSection
                title={`Estimated tax summary`}
                currency={taxSummary.currency}
                rows={[
                  { label: "Taxable profit", value: taxSummary.estimatedTax.taxableProfitStartingPoint },
                  { label: "Personal allowance used", value: taxSummary.estimatedTax.personalAllowanceUsed },
                  { label: "Taxable income after allowance", value: taxSummary.estimatedTax.taxableIncomeAfterAllowance, tone: "strong" },
                  { label: "Estimated Income Tax", value: taxSummary.estimatedTax.estimatedIncomeTax },
                  { label: "Estimated National Insurance", value: taxSummary.estimatedTax.estimatedNationalInsurance },
                ]}
                footer={{ label: "Total estimated tax", value: taxSummary.estimatedTax.totalEstimatedTax }}
              />
            </div>
          ) : (
            <Card className="space-y-4">
              <div className="flex items-start gap-3">
                <Wallet className="mt-0.5 h-5 w-5 text-[var(--color-accent)]" />
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Estimated tax summary</h3>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    Owner-level tax is only estimated in sole trader mode.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT: breakdowns */}
        <div className="space-y-6">
          {/* Tax claimability breakdown */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              Tax Claimability Breakdown
            </p>

            <div className="space-y-3">
              <TaxCategoryTable
                title="Fully claimable"
                description="100% reduces taxable profit"
                rows={taxSummary.fullyClaimableCategories}
                currency={taxSummary.currency}
                tone="green"
              />

              <TaxCategoryTable
                title="Partially claimable"
                description="Only part reduces taxable profit"
                rows={taxSummary.partiallyClaimableCategories}
                currency={taxSummary.currency}
                tone="amber"
                showPercentage
              />

              <TaxCategoryTable
                title="Non-claimable (add-backs)"
                description="Added back — does not reduce taxable profit"
                rows={taxSummary.nonClaimableCategories}
                currency={taxSummary.currency}
                tone="red"
              />
            </div>
          </div>

          {/* P&L Accounting breakdowns */}
          <CategoryBreakdown
            title="Income by category"
            rows={incomeRows}
            currency={taxSummary.currency}
          />

          <CategoryBreakdown
            title="All expenses by category"
            rows={expenseRows}
            currency={taxSummary.currency}
          />

          {/* Assumptions */}
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-[var(--color-accent)]" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Assumptions and disclaimer</h3>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Estimates for manual tax preparation only — not filing outputs.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {taxSummary.assumptions.map((assumption) => (
                <div
                  key={assumption}
                  className="rounded-2xl bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]"
                >
                  {assumption}
                </div>
              ))}

              {taxSummary.estimatedTax?.assumptions.map((assumption) => (
                <div
                  key={assumption}
                  className="rounded-2xl bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]"
                >
                  {assumption}
                </div>
              ))}

              {!vatReport.isVatRegistered ? (
                <div className="rounded-2xl bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                  VAT is disabled in this workspace, so VAT calculations are omitted from the working estimate.
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
