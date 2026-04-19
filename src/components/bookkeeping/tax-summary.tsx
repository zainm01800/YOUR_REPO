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
          ? "border-indigo-200 bg-indigo-50"
          : tone === "muted"
            ? "border-[var(--color-border)] bg-[var(--color-panel)]"
            : "border-[var(--color-border)] bg-white";

  return (
    <Card className={`space-y-2 rounded-3xl border p-5 ${className} ${accent ? "ring-2 ring-indigo-600/10 ring-offset-0" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="font-mono text-3xl font-bold text-[var(--color-foreground)]">{value}</p>
      <p className="text-sm text-[var(--color-muted-foreground)]">{help}</p>
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
    <Card className="rounded-3xl border-indigo-200 bg-indigo-50 p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600">
            <Calculator className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-indigo-900">MTD ITSA Compliance Required</h3>
            <p className="max-w-xl text-sm leading-relaxed text-indigo-800">
              Your gross income ({formatAmount(grossTurnover, currency)}) has exceeded the <strong>{formatAmount(threshold, currency)}</strong> HMRC threshold.
              Starting from April 2026, you may be required to submit <strong>quarterly updates</strong> to HMRC.
              Note: your actual tax is due via <strong>Payments on Account</strong> (31 Jan &amp; 31 Jul), not quarterly.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl bg-white/60 p-4 border border-indigo-100 min-w-[240px]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Suggested Quarterly Saving</p>
          <p className="font-mono text-2xl font-bold text-indigo-900">{formatAmount(suggestedQuarterlySaving, currency)}</p>
          <p className="text-xs text-indigo-700/70 italic">Set aside each quarter for cash-flow planning.</p>
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
      <Card className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>
        <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">Nothing to show here right now.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-3xl border border-[var(--color-border)] p-0">
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
    <div className="space-y-6">
      <Card className="rounded-3xl border border-[var(--color-border)] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
              <Calculator className="h-3.5 w-3.5" />
              Tax Summary
            </div>
            <div>
              <h2 className="text-3xl font-semibold text-[var(--color-foreground)]">Simple view first</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
                This page starts with the key totals most users care about: profit, VAT position,
                and estimated tax. The more detailed category and tax-band breakdowns are still here,
                just moved into separate tabs so the main screen is easier to read.
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
                className="h-11 min-w-[210px] rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white px-5 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-panel)]"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-2 rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-2">
          <TabsTrigger value="overview" className="rounded-2xl px-5 py-2.5 font-medium data-[state=active]:bg-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="rounded-2xl px-5 py-2.5 font-medium data-[state=active]:bg-white">
            Category Breakdown
          </TabsTrigger>
          {hasEstimatedTax ? (
            <TabsTrigger value="tax" className="rounded-2xl px-5 py-2.5 font-medium data-[state=active]:bg-white">
              Tax Detail
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="notes" className="rounded-2xl px-5 py-2.5 font-medium data-[state=active]:bg-white">
            Notes & Assumptions
          </TabsTrigger>
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Accounting profit"
              value={formatAmount(taxSummary.profitSummary.accountingProfit, taxSummary.currency)}
              help="Your normal bookkeeping profit after income and expenses."
              tone="default"
            />
            <MetricCard
              label="Tax add-backs"
              value={formatAmount(taxSummary.profitSummary.totalTaxAdjustments, taxSummary.currency)}
              help="Items added back because they are non-claimable or still uncategorised."
              tone="warning"
            />
            <MetricCard
              label="Taxable profit"
              value={formatAmount(taxSummary.profitSummary.taxableProfit, taxSummary.currency)}
              help="Your current tax starting point after those adjustments."
              tone="positive"
            />
            <MetricCard
              label={hasEstimatedTax ? "Estimated tax" : "Estimated tax"}
              value={hasEstimatedTax ? formatAmount(taxSummary.estimatedTax!.totalEstimatedTax, taxSummary.currency) : "—"}
              help={
                hasEstimatedTax
                  ? "A planning estimate based on the selected business type and current figures."
                  : "This workspace is in business mode, so the page stops at profit and VAT summary."
              }
              tone={hasEstimatedTax ? "warning" : "muted"}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="rounded-3xl border border-[var(--color-border)] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[var(--color-accent-soft)] p-2 text-[var(--color-accent)]">
                  <CircleDollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Profit summary</h3>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    A plain-English bridge from bookkeeping profit to tax profit.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <SummaryLine
                  label="Total income"
                  value={formatAmount(taxSummary.profitSummary.totalIncome, taxSummary.currency)}
                />
                <SummaryLine
                  label="Total expenses"
                  value={formatSignedAmount(-taxSummary.profitSummary.totalExpenses, taxSummary.currency)}
                />
                <SummaryLine
                  label="Accounting profit"
                  value={formatAmount(taxSummary.profitSummary.accountingProfit, taxSummary.currency)}
                  strong
                />
                <SummaryLine
                  label="Add back non-claimable and uncategorised items"
                  value={formatSignedAmount(taxSummary.profitSummary.totalTaxAdjustments, taxSummary.currency)}
                  tone="warning"
                />
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
                    <SummaryLine
                      label="Estimated total tax"
                      value={formatAmount(taxSummary.estimatedTax!.totalEstimatedTax, taxSummary.currency)}
                      strong
                      tone={taxSummary.estimatedTax!.totalEstimatedTax > 0 ? "warning" : "default"}
                    />
                  </>
                )}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-3xl border border-[var(--color-border)] p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[var(--color-accent-soft)] p-2 text-[var(--color-accent)]">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-foreground)]">VAT summary</h3>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      The VAT position based on the same categorised bookkeeping data.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-0">
                  <SummaryLine label="Output VAT" value={formatAmount(taxSummary.vatSummary.outputVat, taxSummary.currency)} />
                  <SummaryLine label="Input VAT" value={formatAmount(taxSummary.vatSummary.inputVat, taxSummary.currency)} />
                  <SummaryLine label="Non-recoverable VAT" value={formatAmount(taxSummary.vatSummary.nonRecoverableVat, taxSummary.currency)} />
                  <SummaryLine
                    label={netVatDue ? "Net VAT due" : "Net VAT reclaimable"}
                    value={formatAmount(Math.abs(taxSummary.vatSummary.netVatPosition), taxSummary.currency)}
                    strong
                    tone={netVatDue ? "warning" : "positive"}
                  />
                </div>
              </Card>

              {taxSummary.profitSummary.uncategorizedCount > 0 ? (
                <Card className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                    <div>
                      <h3 className="text-base font-semibold text-amber-900">Transactions still need review</h3>
                      <p className="mt-1 text-sm text-amber-800">
                        {taxSummary.profitSummary.uncategorizedCount} transaction
                        {taxSummary.profitSummary.uncategorizedCount === 1 ? "" : "s"} {taxSummary.profitSummary.uncategorizedCount === 1 ? "is" : "are"} still uncategorised.
                        To stay conservative, uncategorised expenses are currently added back instead of treated as claimable.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <div>
                      <h3 className="text-base font-semibold text-emerald-900">No uncategorised items</h3>
                      <p className="mt-1 text-sm text-emerald-800">
                        Everything in the selected period has a bookkeeping category, so the summary is more reliable.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-3xl border border-[var(--color-border)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Step 1
              </p>
              <h3 className="mt-2 text-base font-semibold text-[var(--color-foreground)]">Start with bookkeeping profit</h3>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                We take the same categorised income and expenses used elsewhere in the bookkeeping area.
              </p>
            </Card>
            <Card className="rounded-3xl border border-[var(--color-border)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Step 2
              </p>
              <h3 className="mt-2 text-base font-semibold text-[var(--color-foreground)]">Adjust for tax treatment</h3>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                Non-claimable and uncategorised items are added back so the tax view stays cautious.
              </p>
            </Card>
            <Card className="rounded-3xl border border-[var(--color-border)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Step 3
              </p>
              <h3 className="mt-2 text-base font-semibold text-[var(--color-foreground)]">Estimate tax if relevant</h3>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                In sole trader mode, we turn the taxable profit into a simple owner-level tax estimate.
              </p>
            </Card>
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
              <Card className="rounded-3xl border border-[var(--color-border)] p-6">
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

              <Card className="rounded-3xl border border-[var(--color-border)] p-6">
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

            <Card className="rounded-3xl border border-[var(--color-border)] p-6 space-y-4">
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
          <Card className="rounded-3xl border border-[var(--color-border)] p-6">
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

          <Card className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
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
