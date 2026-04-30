"use client";

import { useState, useTransition } from "react";
import { Download, Info, Receipt, Calculator, AlertTriangle, CheckCircle2, CircleDollarSign } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TaxSummaryReport, TaxCategoryLine } from "@/lib/accounting/tax-summary";

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  AUD: "A$",
  CAD: "C$",
};

function formatAmount(amount: number, currency: string) {
  const prefix = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${prefix}${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedAmount(amount: number, currency: string) {
  const absolute = formatAmount(Math.abs(amount), currency);
  if (amount > 0) return `+${absolute}`;
  if (amount < 0) return `-${absolute}`;
  return absolute;
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
    ["Profit summary"],
    ["Total income", taxSummary.profitSummary.totalIncome.toFixed(2)],
    ["Total expenses", taxSummary.profitSummary.totalExpenses.toFixed(2)],
    ["Accounting profit", taxSummary.profitSummary.accountingProfit.toFixed(2)],
    ["Tax add-backs", taxSummary.profitSummary.totalTaxAdjustments.toFixed(2)],
    ["Taxable profit", taxSummary.profitSummary.taxableProfit.toFixed(2)],
    [],
    ["VAT summary"],
    ["VAT enabled", taxSummary.vatSummary.enabled ? "Yes" : "No"],
    ["Output VAT", taxSummary.vatSummary.outputVat.toFixed(2)],
    ["Input VAT", taxSummary.vatSummary.inputVat.toFixed(2)],
    ["Non-recoverable VAT", taxSummary.vatSummary.nonRecoverableVat.toFixed(2)],
    ["Net VAT position", taxSummary.vatSummary.netVatPosition.toFixed(2)],
  ];

  if (taxSummary.estimatedTax) {
    rows.push(
      [],
      ["Estimated tax"],
      ["Tax year", taxSummary.estimatedTax.taxYearLabel],
      ["Taxable profit starting point", taxSummary.estimatedTax.taxableProfitStartingPoint.toFixed(2)],
      ["Personal allowance used", taxSummary.estimatedTax.personalAllowanceUsed.toFixed(2)],
      ["Taxable income after allowance", taxSummary.estimatedTax.taxableIncomeAfterAllowance.toFixed(2)],
      ["Effective personal allowance", taxSummary.estimatedTax.effectivePersonalAllowance.toFixed(2)],
      ["Estimated income tax", taxSummary.estimatedTax.estimatedIncomeTax.toFixed(2)],
      ["Estimated Class 2 NI", taxSummary.estimatedTax.estimatedClass2Ni.toFixed(2)],
      ["Estimated Class 4 NI", taxSummary.estimatedTax.estimatedClass4Ni.toFixed(2)],
      ["Total national insurance", taxSummary.estimatedTax.estimatedNationalInsurance.toFixed(2)],
      ["Total estimated tax", taxSummary.estimatedTax.totalEstimatedTax.toFixed(2)],
    );
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

function MetricCard({
  label,
  value,
  help,
  tone = "default",
  accent = false,
}: {
  label: string;
  value: string;
  help: string;
  tone?: "default" | "positive" | "warning" | "muted" | "info";
  accent?: boolean;
}) {
  const className =
    tone === "positive"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : tone === "info"
          ? "border-[var(--accent-soft)] bg-[var(--accent-softer)]"
          : tone === "muted"
            ? "border-[var(--color-border)] bg-[var(--color-panel)]"
            : "border-[var(--color-border)] bg-white";

  return (
    <Card className={`space-y-2 rounded-2xl border p-5 ${className} ${accent ? "ring-2 ring-[var(--accent-soft)] ring-offset-0" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
        {label}
      </p>
      <p className="font-mono text-3xl font-semibold tracking-[-0.03em] text-[var(--ink)]">{value}</p>
      <p className="text-sm text-[var(--muted)]">{help}</p>
    </Card>
  );
}

function percentOf(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}

function EstimateOverviewCard({ taxSummary }: { taxSummary: TaxSummaryReport }) {
  const estimate = taxSummary.estimatedTax;

  if (!estimate) {
    return (
      <Card className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <div className="panel-head">
          <div>
            <p className="panel-eyebrow">Estimate</p>
            <h3 className="panel-title">Tax estimate not active</h3>
            <p className="panel-sub">
              This workspace is in general business mode, so the app shows profit and VAT summaries without an owner-level estimate.
            </p>
          </div>
          <span className="panel-tag">Business mode</span>
        </div>
        <div className="tax-hero">
          <p className="tax-hero-amt">-</p>
          <p className="tax-hero-sub">No estimate shown</p>
        </div>
        <p className="text-sm text-[var(--muted)]">
          If the workspace is changed to sole trader mode, this panel can show a simple planning estimate from taxable profit.
        </p>
      </Card>
    );
  }

  const totalEstimate = estimate.totalEstimatedTax;
  const firstPayment = estimate.paymentsOnAccount[0]?.amount ?? totalEstimate / 2;
  const quarterlySaving = taxSummary.mtdCompliance.suggestedQuarterlySaving;
  const setAsideRate = taxSummary.profitSummary.taxableProfit > 0
    ? (totalEstimate / taxSummary.profitSummary.taxableProfit) * 100
    : 0;

  return (
    <Card className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <div className="panel-head">
        <div>
          <p className="panel-eyebrow">Estimate</p>
          <h3 className="panel-title">Estimated tax to set aside</h3>
          <p className="panel-sub">
            A planning view based on taxable profit. It is not a filing result.
          </p>
        </div>
        <span className="panel-tag">{estimate.taxYearLabel}</span>
      </div>

      <div className="tax-hero">
        <p className="tax-hero-amt">{formatAmount(totalEstimate, taxSummary.currency)}</p>
        <p className="tax-hero-sub">total estimate</p>
      </div>

      <div className="tax-bars">
        <div>
          <div className="tax-bar-row">
            <span className="tax-bar-label">Income tax</span>
            <span className="tax-bar-val">{formatAmount(estimate.estimatedIncomeTax, taxSummary.currency)}</span>
          </div>
          <div className="tax-track">
            <div className="tax-fill tax-a" style={{ width: `${percentOf(estimate.estimatedIncomeTax, totalEstimate)}%` }} />
          </div>
        </div>
        <div>
          <div className="tax-bar-row">
            <span className="tax-bar-label">National insurance</span>
            <span className="tax-bar-val">{formatAmount(estimate.estimatedNationalInsurance, taxSummary.currency)}</span>
          </div>
          <div className="tax-track">
            <div className="tax-fill tax-b" style={{ width: `${percentOf(estimate.estimatedNationalInsurance, totalEstimate)}%` }} />
          </div>
        </div>
        <div>
          <div className="tax-bar-row">
            <span className="tax-bar-label">Suggested quarterly saving</span>
            <span className="tax-bar-val">{formatAmount(quarterlySaving, taxSummary.currency)}</span>
          </div>
          <div className="tax-track">
            <div className="tax-fill tax-c" style={{ width: `${percentOf(quarterlySaving, totalEstimate)}%` }} />
          </div>
        </div>
      </div>

      <div className="tax-foot">
        <div>
          <p className="mini-label">Set aside</p>
          <p className="mini-value">{setAsideRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="mini-label">First payment</p>
          <p className="mini-value">{formatAmount(firstPayment, taxSummary.currency)}</p>
        </div>
        <div>
          <p className="mini-label">After allowance</p>
          <p className="mini-value">{formatAmount(estimate.taxableIncomeAfterAllowance, taxSummary.currency)}</p>
        </div>
      </div>
    </Card>
  );
}

function MTDComplianceAlert({
  grossTurnover,
  threshold,
  currency,
  suggestedQuarterlySaving,
}: {
  grossTurnover: number;
  threshold: number;
  currency: string;
  suggestedQuarterlySaving: number;
}) {
  return (
    <Card className="rounded-2xl border-[var(--accent-soft)] bg-[var(--accent-softer)] p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="rounded-2xl bg-white p-3 text-[var(--accent-ink)]">
            <Calculator className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--ink)]">Quarterly reporting may apply</h3>
            <p className="max-w-xl text-sm leading-relaxed text-[var(--ink-2)]">
              Your gross income ({formatAmount(grossTurnover, currency)}) has exceeded the <strong>{formatAmount(threshold, currency)}</strong> HMRC threshold.
              Starting from April 2026, you may be required to submit <strong>quarterly updates</strong> to HMRC.
              Note: your actual tax is due via <strong>Payments on Account</strong> (31 Jan &amp; 31 Jul), not quarterly.
            </p>
          </div>
        </div>

        <div className="flex min-w-[240px] flex-col gap-2 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Suggested Quarterly Saving</p>
          <p className="font-mono text-2xl font-bold text-[var(--ink)]">{formatAmount(suggestedQuarterlySaving, currency)}</p>
          <p className="text-xs text-[var(--muted)] italic">Set aside each quarter for cash-flow planning.</p>
        </div>
      </div>
    </Card>
  );
}

function SummaryLine({
  label,
  value,
  tone = "default",
  strong = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "positive";
  strong?: boolean;
}) {
  const valueClass =
    tone === "warning"
      ? "text-amber-700"
      : tone === "positive"
        ? "text-emerald-700"
        : "text-[var(--color-foreground)]";

  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${strong ? "border-t border-[var(--color-border)] pt-4" : ""}`}>
      <span className={`text-sm ${strong ? "font-semibold text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"}`}>
        {label}
      </span>
      <span className={`font-mono text-sm ${strong ? "font-bold" : "font-medium"} ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

function CategoryBreakdownTable({
  title,
  description,
  rows,
  currency,
  showAllowance,
}: {
  title: string;
  description: string;
  rows: TaxCategoryLine[];
  currency: string;
  showAllowance?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Card className="cm-empty p-6">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>
        <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">Nothing to show here right now.</p>
      </Card>
    );
  }

  return (
    <Card className="cm-table-wrap p-0">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-4">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-white">
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Category
              </th>
              <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Accounting amount
              </th>
              {showAllowance ? (
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  Claim %
                </th>
              ) : null}
              <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Claimable
              </th>
              <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Add-back
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${row.category}`} className={index > 0 ? "border-t border-[var(--color-border)]" : ""}>
                <td className="px-6 py-4">
                  <div className="font-medium text-[var(--color-foreground)]">{row.category}</div>
                  <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{row.reportingBucket}</div>
                </td>
                <td className="px-6 py-4 text-right font-mono text-[var(--color-foreground)]">
                  {formatAmount(row.accountingAmount, currency)}
                </td>
                {showAllowance ? (
                  <td className="px-6 py-4 text-right font-mono text-[var(--color-foreground)]">
                    {row.allowablePercentage}%
                  </td>
                ) : null}
                <td className="px-6 py-4 text-right font-mono text-emerald-700">
                  {formatAmount(row.claimableAmount, currency)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-amber-700">
                  {row.nonClaimableAmount > 0 ? formatAmount(row.nonClaimableAmount, currency) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function TaxSummary({
  taxSummary,
  periodOptions,
  selectedPeriod,
}: {
  taxSummary: TaxSummaryReport;
  periodOptions: string[];
  selectedPeriod?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"overview" | "breakdown" | "tax" | "notes">("overview");

  const hasEstimatedTax = Boolean(taxSummary.estimatedTax);
  const netVatDue = taxSummary.vatSummary.netVatPosition >= 0;

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
    const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tax-summary-${suffix}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-softer)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-ink)]">
              <Calculator className="h-3.5 w-3.5" />
              Tax summary
            </div>
            <div>
              <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--ink)]">Your tax year at a glance</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Start here for the figures that matter: money in, claimable costs, taxable profit, and the estimated amount to set aside. Detailed breakdowns live in the tabs below.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
              <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                Period
              </span>
              <select
                value={selectedPeriod ?? "all"}
                onChange={(event) => updatePeriod(event.target.value)}
                disabled={isPending}
                className="h-10 min-w-[210px] rounded-[9px] border border-[var(--line)] bg-white px-3 text-sm font-medium text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
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
              className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--color-panel)]"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Income counted",
              value: formatAmount(taxSummary.profitSummary.totalIncome, taxSummary.currency),
              help: "Sales and other income in this period.",
            },
            {
              label: "Claimed expenses",
              value: formatAmount(taxSummary.profitSummary.totalExpenses, taxSummary.currency),
              help: "Business costs before tax adjustments.",
            },
            {
              label: "Taxable profit",
              value: formatAmount(taxSummary.profitSummary.taxableProfit, taxSummary.currency),
              help: "The starting point for the estimate.",
            },
            {
              label: hasEstimatedTax ? "Estimated to set aside" : taxSummary.vatSummary.enabled ? "Net VAT position" : "Review status",
              value: hasEstimatedTax
                ? formatAmount(taxSummary.estimatedTax!.totalEstimatedTax, taxSummary.currency)
                : taxSummary.vatSummary.enabled
                  ? formatAmount(Math.abs(taxSummary.vatSummary.netVatPosition), taxSummary.currency)
                  : taxSummary.profitSummary.uncategorizedCount === 0
                    ? "Ready"
                    : `${taxSummary.profitSummary.uncategorizedCount} to review`,
              help: hasEstimatedTax
                ? "Planning estimate only, not a filing result."
                : taxSummary.vatSummary.enabled
                  ? netVatDue ? "Likely VAT payable." : "Likely VAT reclaimable."
                  : "Categorisation confidence check.",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--line)] bg-[var(--color-panel)] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                {item.label}
              </p>
              <p className="mt-2 font-mono text-lg font-bold tabular-nums text-[var(--color-foreground)]">
                {item.value}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                {item.help}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-5">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Category Breakdown</TabsTrigger>
          {hasEstimatedTax ? <TabsTrigger value="tax">Tax Detail</TabsTrigger> : null}
          <TabsTrigger value="notes">Notes & Assumptions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {taxSummary.mtdCompliance.requiresQuarterlyReporting && (
            <MTDComplianceAlert
              grossTurnover={taxSummary.mtdCompliance.grossTurnover}
              threshold={taxSummary.mtdCompliance.threshold}
              currency={taxSummary.currency}
              suggestedQuarterlySaving={taxSummary.mtdCompliance.suggestedQuarterlySaving}
            />
          )}

          {/* Two-column: income statement left, key figures right */}
          <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
            {/* Left — income statement */}
            <Card className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-[10px] bg-[var(--accent-softer)] p-2 text-[var(--accent-ink)]">
                  <CircleDollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="panel-title mt-0">Profit summary</h3>
                  <p className="panel-sub">Income → expenses → taxable profit</p>
                </div>
              </div>

              <SummaryLine
                label="Gross sales"
                value={formatAmount(taxSummary.profitSummary.totalIncome, taxSummary.currency)}
              />
              <SummaryLine
                label="Business expenses"
                value={formatSignedAmount(-taxSummary.profitSummary.totalExpenses, taxSummary.currency)}
              />
              <SummaryLine
                label="Accounting profit"
                value={formatAmount(taxSummary.profitSummary.accountingProfit, taxSummary.currency)}
                strong
              />
              {taxSummary.profitSummary.totalTaxAdjustments > 0 && (
                <SummaryLine
                  label="Add back non-claimable items"
                  value={formatSignedAmount(taxSummary.profitSummary.totalTaxAdjustments, taxSummary.currency)}
                  tone="warning"
                />
              )}
              <SummaryLine
                label="Taxable profit"
                value={formatAmount(taxSummary.profitSummary.taxableProfit, taxSummary.currency)}
                tone="positive"
                strong
              />
              {hasEstimatedTax && (
                <>
                  <SummaryLine
                    label="Less: Personal allowance"
                    value={formatSignedAmount(-taxSummary.estimatedTax!.personalAllowanceUsed, taxSummary.currency)}
                    tone="positive"
                  />
                  <SummaryLine
                    label="Taxable income after allowances"
                    value={formatAmount(taxSummary.estimatedTax!.taxableIncomeAfterAllowance, taxSummary.currency)}
                    strong
                    tone={taxSummary.estimatedTax!.taxableIncomeAfterAllowance > 0 ? "positive" : "default"}
                  />
                </>
              )}

              {/* VAT section */}
              {taxSummary.vatSummary.enabled && (
                <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                  <div className="flex items-center gap-2 mb-4">
                    <Receipt className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">VAT position</span>
                  </div>
                  <SummaryLine label="Output VAT" value={formatAmount(taxSummary.vatSummary.outputVat, taxSummary.currency)} />
                  <SummaryLine label="Input VAT" value={formatAmount(taxSummary.vatSummary.inputVat, taxSummary.currency)} />
                  <SummaryLine
                    label={netVatDue ? "Net VAT due" : "Net VAT reclaimable"}
                    value={formatAmount(Math.abs(taxSummary.vatSummary.netVatPosition), taxSummary.currency)}
                    strong
                    tone={netVatDue ? "warning" : "positive"}
                  />
                </div>
              )}
            </Card>

            {/* Right — key figures panel */}
            <div className="space-y-4">
              <Card className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-sm)]">
                {/* Ready badge */}
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-[var(--color-foreground)]">Key Figures</h3>
                  {taxSummary.profitSummary.uncategorizedCount === 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Ready for Self Assessment
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      Needs review
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {[
                    {
                      label: "Turnover",
                      value: formatAmount(taxSummary.profitSummary.totalIncome, taxSummary.currency),
                      tone: "default" as const,
                    },
                    {
                      label: "Taxable profit",
                      value: formatAmount(taxSummary.profitSummary.taxableProfit, taxSummary.currency),
                      tone: "positive" as const,
                    },
                    ...(hasEstimatedTax ? [{
                      label: "Personal allowance",
                      value: formatAmount(taxSummary.estimatedTax!.personalAllowanceUsed, taxSummary.currency),
                      tone: "default" as const,
                    }, {
                      label: "Estimated tax due",
                      value: formatAmount(taxSummary.estimatedTax!.totalEstimatedTax, taxSummary.currency),
                      tone: "warning" as const,
                    }] : []),
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3"
                    >
                      <span className="text-sm text-[var(--color-muted-foreground)]">{item.label}</span>
                      <span className={`font-mono text-sm font-semibold tabular-nums ${
                        item.tone === "positive" ? "text-emerald-700" :
                        item.tone === "warning" ? "text-amber-700" :
                        "text-[var(--color-foreground)]"
                      }`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={exportSummary}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--color-panel)] px-4 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-white"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </button>
              </Card>

              {/* Uncategorised warning / all-clear */}
              {taxSummary.profitSummary.uncategorizedCount > 0 ? (
                <Card className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        {taxSummary.profitSummary.uncategorizedCount} uncategorised transaction{taxSummary.profitSummary.uncategorizedCount !== 1 ? "s" : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-amber-800">
                        Uncategorised expenses are added back to keep the estimate conservative.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">All transactions categorised</p>
                      <p className="mt-0.5 text-xs text-emerald-800">
                        The summary is as accurate as possible given your current data.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Tax estimate overview (if sole trader) */}
              {hasEstimatedTax && <EstimateOverviewCard taxSummary={taxSummary} />}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          <CategoryBreakdownTable
            title="Partially claimable categories"
            description="These reduce taxable profit, but only by the allowed percentage."
            rows={taxSummary.partiallyClaimableCategories}
            currency={taxSummary.currency}
            showAllowance
          />

          <CategoryBreakdownTable
            title="Non-claimable categories"
            description="These appear in bookkeeping profit but are added back for tax."
            rows={taxSummary.nonClaimableCategories}
            currency={taxSummary.currency}
          />

          <CategoryBreakdownTable
            title="Fully claimable categories"
            description="These expense categories are fully reducing taxable profit."
            rows={taxSummary.fullyClaimableCategories}
            currency={taxSummary.currency}
          />
        </TabsContent>

        {hasEstimatedTax ? (
          <TabsContent value="tax" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Taxable profit starting point"
                value={formatAmount(taxSummary.estimatedTax!.taxableProfitStartingPoint, taxSummary.currency)}
                help="The profit figure used before any personal allowance."
              />
              <MetricCard
                label={
                  taxSummary.estimatedTax!.effectivePersonalAllowance < 12_570
                    ? "Personal allowance (tapered)"
                    : "Personal allowance used"
                }
                value={formatAmount(taxSummary.estimatedTax!.personalAllowanceUsed, taxSummary.currency)}
                help={
                  taxSummary.estimatedTax!.effectivePersonalAllowance < 12_570
                    ? `Reduced from £12,570 because income exceeds £100,000. Effective allowance: £${taxSummary.estimatedTax!.effectivePersonalAllowance.toLocaleString("en-GB")}.`
                    : "The amount treated as tax-free in this estimate."
                }
                tone={taxSummary.estimatedTax!.effectivePersonalAllowance < 12_570 ? "warning" : "muted"}
              />
              <MetricCard
                label="Taxable income after allowance"
                value={formatAmount(taxSummary.estimatedTax!.taxableIncomeAfterAllowance, taxSummary.currency)}
                help="The amount the income tax estimate is actually applied to."
                tone="positive"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="cm-panel p-5">
                <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Income tax breakdown</h3>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Estimate split across the active tax bands (2026/27).
                </p>
                <div className="mt-6 space-y-3">
                  {taxSummary.estimatedTax!.incomeTaxBreakdown.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">No income tax estimated at this profit level.</p>
                  ) : (
                    taxSummary.estimatedTax!.incomeTaxBreakdown.map((band) => (
                      <SummaryLine
                        key={band.band}
                        label={`${band.band} (${Math.round(band.rate * 100)}%)`}
                        value={formatAmount(band.amount, taxSummary.currency)}
                      />
                    ))
                  )}
                  <SummaryLine
                    label="Estimated income tax"
                    value={formatAmount(taxSummary.estimatedTax!.estimatedIncomeTax, taxSummary.currency)}
                    strong
                  />
                </div>
              </Card>

              <Card className="cm-panel p-5">
                <h3 className="text-lg font-semibold text-[var(--color-foreground)]">National Insurance breakdown</h3>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Class 2 (flat rate) + Class 4 (profit-linked) for sole traders.
                </p>
                <div className="mt-6 space-y-3">
                  {taxSummary.estimatedTax!.niBreakdown.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">No National Insurance estimated at this profit level.</p>
                  ) : (
                    taxSummary.estimatedTax!.niBreakdown.map((band) => (
                      <SummaryLine
                        key={band.band}
                        label={band.band}
                        value={formatAmount(band.amount, taxSummary.currency)}
                      />
                    ))
                  )}
                  <SummaryLine
                    label="Total National Insurance"
                    value={formatAmount(taxSummary.estimatedTax!.estimatedNationalInsurance, taxSummary.currency)}
                    strong
                  />
                </div>
              </Card>
            </div>

            <Card className="cm-panel space-y-4 p-5">
              <SummaryLine
                label="Total estimated tax (income tax + NI)"
                value={formatAmount(taxSummary.estimatedTax!.totalEstimatedTax, taxSummary.currency)}
                tone="warning"
                strong
              />
              {taxSummary.estimatedTax!.paymentsOnAccount.length > 0 && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-bold text-amber-900 mb-3">HMRC Payment Schedule</p>
                  <p className="text-xs text-amber-700 mb-4">
                    Sole traders pay tax via <strong>Payments on Account</strong> — two instalments of 50% each, not quarterly.
                  </p>
                  <div className="space-y-2">
                    {taxSummary.estimatedTax!.paymentsOnAccount.map((poa) => (
                      <div key={poa.dueDate} className="flex items-center justify-between gap-4 rounded-xl bg-white/70 px-4 py-2.5">
                        <div>
                          <p className="text-xs font-semibold text-amber-900">{poa.dueDate}</p>
                          <p className="text-[11px] text-amber-700">{poa.description}</p>
                        </div>
                        <p className="font-mono text-sm font-bold text-amber-900 shrink-0">
                          {poa.amount > 0 ? formatAmount(poa.amount, taxSummary.currency) : "TBC after filing"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        ) : null}

        <TabsContent value="notes" className="space-y-6">
          <Card className="cm-panel p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[var(--color-accent-soft)] p-2 text-[var(--color-accent)]">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Assumptions</h3>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  These are the main rules the current summary is using.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {taxSummary.assumptions.map((assumption, index) => (
                <div key={`${assumption}-${index}`} className="rounded-2xl bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                  {assumption}
                </div>
              ))}
              {taxSummary.estimatedTax?.assumptions.map((assumption, index) => (
                <div key={`estimated-${assumption}-${index}`} className="rounded-2xl bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                  {assumption}
                </div>
              ))}
            </div>
          </Card>

          <Card className="cm-panel-subtle p-5">
            <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Important note</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              This page is a practical planning summary, not a filing submission or formal tax advice.
              It is designed to help users understand their current bookkeeping position and prepare for
              manual tax work more confidently.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
