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
        ["Uncategorized items", taxSummary.profitSummary.uncategorizedExpenses.toFixed(2)],
        ["Personal allowance used", taxSummary.estimatedTax.personalAllowanceUsed.toFixed(2)],
        ["Taxable income after allowance", taxSummary.estimatedTax.taxableIncomeAfterAllowance.toFixed(2)],
        ["Total Income tax", taxSummary.estimatedTax.estimatedIncomeTax.toFixed(2)],
        ...taxSummary.estimatedTax.incomeTaxBreakdown.map(b => [`  ${b.band} (${Math.round(b.rate * 100)}%)`, b.amount.toFixed(2)]),
        ["Total National Insurance", taxSummary.estimatedTax.estimatedNationalInsurance.toFixed(2)],
        ...taxSummary.estimatedTax.niBreakdown.map(b => [`  ${b.band} (${Math.round(b.rate * 100)}%)`, b.amount.toFixed(2)]),
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
  description,
}: {
  label: string;
  value: string;
  tone?: "default" | "profit" | "expense" | "warning";
  description?: string;
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
    <div className={`rounded-3xl border p-5 transition-shadow hover:shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold tracking-tight">{value}</p>
      {description && <p className="mt-1 text-[10px] font-medium opacity-70 uppercase tracking-wider">{description}</p>}
    </div>
  );
}

function TaxSection({
  title,
  rows,
  currency,
  footer,
  eyebrow,
}: {
  title: string;
  rows: Array<{ label: string; value: number; tone?: "default" | "strong" | "addition" | "deduction"; hint?: string }>;
  currency: string;
  footer?: { label: string; value: number };
  eyebrow?: string;
}) {
  return (
    <Card className="flex flex-col space-y-0 overflow-hidden p-0 border-[var(--color-border)] shadow-sm">
      <div className="bg-[var(--color-panel)] px-6 py-4 border-b border-[var(--color-border)]">
        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)] mb-1">{eyebrow}</p>}
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
              <td className="px-6 py-4">
                <span className="text-[var(--color-foreground)] font-medium">{row.label}</span>
                {row.hint && <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">{row.hint}</p>}
              </td>
              <td
                className={`px-6 py-4 text-right font-mono ${
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
              <td className="px-6 py-4 text-sm font-bold text-[var(--color-foreground)]">
                {footer.label}
              </td>
              <td className="px-6 py-4 text-right font-mono text-sm font-bold text-[var(--color-foreground)]">
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
      {/* Search/Filter warnings */}
      {taxSummary.profitSummary.uncategorizedCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-2">
              <p className="text-sm font-bold">Uncategorised transactions detected</p>
              <p className="text-sm leading-relaxed">
                There are <strong>{taxSummary.profitSummary.uncategorizedCount}</strong> transactions that haven't been categorised yet. 
                For tax safety, these expenses are <strong>not</strong> being used to reduce your taxable profit estimate.
              </p>
              <button 
                onClick={() => router.push('/bookkeeping/transactions')}
                className="text-sm font-bold underline decoration-amber-400 decoration-2 underline-offset-4 hover:decoration-amber-600"
              >
                Review and categorise now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700 border border-blue-100 mb-4">
              <Wallet className="h-3 w-3" />
              Working Estimate
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-5xl">
              Tax Summary
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[var(--color-muted-foreground)]">
              Transforming your accounting profit into an estimated tax bill. Our engine adjusts for claimability rules and calculates thresholds line-by-line.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] ml-1">Reporting Period</span>
              <select
                value={selectedPeriod ?? "all"}
                onChange={(event) => updatePeriod(event.target.value)}
                disabled={isPending}
                className="h-12 min-w-[220px] cursor-pointer rounded-2xl border border-[var(--color-border)] bg-white px-5 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-soft)]"
              >
                <option value="all">All-time performance</option>
                {periodOptions.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={exportSummary}
              className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white px-6 text-sm font-bold text-[var(--color-foreground)] transition-all hover:bg-[var(--color-panel)] hover:shadow-sm"
            >
              <Download className="h-4 w-4" />
              Download Report
            </button>
          </div>
        </div>

        {/* Hero KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <SummaryCard
            label="Gross Income"
            value={formatAmount(taxSummary.profitSummary.totalIncome, taxSummary.currency)}
            tone="profit"
            description="Total revenue"
          />
          <SummaryCard
            label="Accounting Profit"
            value={formatAmount(taxSummary.profitSummary.accountingProfit, taxSummary.currency)}
            tone={taxSummary.profitSummary.accountingProfit >= 0 ? "default" : "warning"}
            description="Before tax adjustments"
          />
          <SummaryCard
            label="Taxable Profit"
            value={formatAmount(taxSummary.profitSummary.taxableProfit, taxSummary.currency)}
            tone="profit"
            description="Adjusted for HMRC"
          />
          <SummaryCard
            label="Total Est. Tax"
            value={
              taxSummary.estimatedTax
                ? formatAmount(taxSummary.estimatedTax.totalEstimatedTax, taxSummary.currency)
                : "—"
            }
            tone={taxSummary.estimatedTax ? "warning" : "default"}
            description="Income Tax + Class 4 NI"
          />
          <SummaryCard
            label="Pending Review"
            value={taxSummary.profitSummary.uncategorizedCount > 0 
              ? `${taxSummary.profitSummary.uncategorizedCount}`
              : "0"}
            tone={taxSummary.profitSummary.uncategorizedCount > 0 ? "warning" : "default"}
            description="Untracked txns"
          />
        </div>
      </section>

      {/* The Step-by-Step Guided Assessment */}
      <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
        {/* Step 1 & 2: Main Logic Flow */}
        <div className="space-y-16">
          
          {/* STEP 1: PROFIT PERFORMANCE */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-foreground)] text-xs font-bold text-white">1</span>
              <h2 className="text-xl font-bold tracking-tight">Accounting Performance</h2>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <TaxSection
                title="Profit & Loss"
                eyebrow="Accounting View"
                currency={taxSummary.currency}
                rows={[
                  { label: "Gross Income", value: taxSummary.profitSummary.totalIncome, hint: "Total sales/revenue" },
                  { label: "Total Expenses", value: taxSummary.profitSummary.totalExpenses, hint: "All categorised expenses" },
                ]}
                footer={{ label: "Net Accounting Profit", value: taxSummary.profitSummary.accountingProfit }}
              />

              <TaxSection
                title="VAT Overview"
                eyebrow="Consumption Tax"
                currency={taxSummary.currency}
                rows={
                  taxSummary.vatSummary.enabled
                    ? [
                        { label: "VAT on Income", value: taxSummary.vatSummary.outputVat },
                        { label: "Recoverable VAT", value: taxSummary.vatSummary.inputVat },
                      ]
                    : [{ label: "Registration Disabled", value: 0 }]
                }
                footer={
                  taxSummary.vatSummary.enabled
                    ? {
                        label: taxSummary.vatSummary.netVatPosition >= 0 ? "Net Due (estimate)" : "Net Reclaim (estimate)",
                        value: Math.abs(taxSummary.vatSummary.netVatPosition),
                      }
                    : undefined
                }
              />
            </div>
          </section>

          {/* STEP 2: TAX ADJUSTMENTS (THE BRIDGE) */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-foreground)] text-xs font-bold text-white">2</span>
              <h2 className="text-xl font-bold tracking-tight">Tax Adjustments & Bridge</h2>
            </div>

            <Card className="p-0 overflow-hidden border-[var(--color-border)] shadow-md text-[var(--color-foreground)]">
              <div className="bg-amber-50/50 px-6 py-8 border-b border-[var(--color-border)] text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700 mb-2">Bridge to Taxable Profit</p>
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Accounting</p>
                      <p className="text-xl font-mono font-bold tracking-tight">{formatAmount(taxSummary.profitSummary.accountingProfit, taxSummary.currency)}</p>
                    </div>
                    <div className="text-2xl text-[var(--color-muted-foreground)] font-light">+</div>
                    <div className="text-center">
                      <p className="text-xs text-amber-700 mb-1">Add-backs</p>
                      <p className="text-xl font-mono font-bold text-amber-700 tracking-tight">{formatAmount(taxSummary.profitSummary.disallowedExpenses + taxSummary.profitSummary.uncategorizedExpenses, taxSummary.currency)}</p>
                    </div>
                    <div className="text-2xl text-[var(--color-muted-foreground)] font-light">=</div>
                    <div className="text-center">
                      <p className="text-xs text-emerald-700 mb-1">Taxable Profit</p>
                      <p className="text-2xl font-mono font-bold text-emerald-800 tracking-tighter">{formatAmount(taxSummary.profitSummary.taxableProfit, taxSummary.currency)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-4">Breakdown of Non-Claimable Items</h3>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">Disallowed Expenses</span>
                    <span className="text-sm font-mono font-bold text-amber-700">+{formatAmount(taxSummary.profitSummary.disallowedExpenses, taxSummary.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)] border-dashed">
                    <span className="text-sm font-medium">Uncategorised Expenses (Safety Buffer)</span>
                    <span className="text-sm font-mono font-bold text-amber-700">+{formatAmount(taxSummary.profitSummary.uncategorizedExpenses, taxSummary.currency)}</span>
                  </div>
                  <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-[10px] text-emerald-800 font-medium font-[var(--font-inter)]">
                    ⓘ These items were subtracted from your account profit but are added back for tax purposes because they do not qualify for HMRC relief.
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* STEP 3: TAX CALCULATION (DETAILED) */}
          {taxSummary.estimatedTax && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-foreground)] text-xs font-bold text-white">3</span>
                <h2 className="text-xl font-bold tracking-tight">Final Estimated Tax Bill</h2>
              </div>

              <div className="grid gap-6">
                {/* Income Tax Breakdown */}
                <Card className="p-0 overflow-hidden border-[var(--color-border)] shadow-sm text-[var(--color-foreground)]">
                  <div className="border-b border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest">Income Tax</h3>
                      <p className="text-[10px] text-[var(--color-muted-foreground)]">Calculated on taxable income after allowances</p>
                    </div>
                    <div className="font-mono font-bold text-lg">
                      {formatAmount(taxSummary.estimatedTax.estimatedIncomeTax, taxSummary.currency)}
                    </div>
                  </div>
                  <div className="p-6 space-y-4 text-[var(--color-foreground)]">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-muted-foreground)]">Taxable Profit Starting Point</span>
                      <span className="font-mono font-medium">{formatAmount(taxSummary.estimatedTax.taxableProfitStartingPoint, taxSummary.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm py-4 border-y border-[var(--color-border)] border-dashed">
                      <span className="text-[var(--color-muted-foreground)]">Personal Allowance (2026/27)</span>
                      <span className="font-mono font-medium text-emerald-700">-{formatAmount(taxSummary.estimatedTax.personalAllowanceUsed, taxSummary.currency)}</span>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Tax Bands</p>
                      {taxSummary.estimatedTax.incomeTaxBreakdown.map((band) => (
                        <div key={band.band} className="flex items-center justify-between text-xs py-1">
                          <span className="flex items-center gap-2">
                             <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                             {band.band} ({Math.round(band.rate * 100)}%)
                          </span>
                          <span className="font-mono font-bold">{formatAmount(band.amount, taxSummary.currency)}</span>
                        </div>
                      ))}
                      {taxSummary.estimatedTax.incomeTaxBreakdown.length === 0 && (
                        <p className="text-xs text-[var(--color-muted-foreground)] italic">Income falls within Personal Allowance threshold.</p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* National Insurance Breakdown */}
                <Card className="p-0 overflow-hidden border-[var(--color-border)] shadow-sm text-[var(--color-foreground)]">
                  <div className="border-b border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest">National Insurance (Class 4)</h3>
                      <p className="text-[10px] text-[var(--color-muted-foreground)]">Calculated on full taxable profit</p>
                    </div>
                    <div className="font-mono font-bold text-lg">
                      {formatAmount(taxSummary.estimatedTax.estimatedNationalInsurance, taxSummary.currency)}
                    </div>
                  </div>
                  <div className="p-6 space-y-4 text-[var(--color-foreground)]">
                    <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">NI Bands</p>
                        {taxSummary.estimatedTax.niBreakdown.map((band) => (
                          <div key={band.band} className="flex items-center justify-between text-xs py-1">
                            <span className="flex items-center gap-2">
                               <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                               {band.band} ({Math.round(band.rate * 100)}%)
                            </span>
                            <span className="font-mono font-bold">{formatAmount(band.amount, taxSummary.currency)}</span>
                          </div>
                      ))}
                      {taxSummary.estimatedTax.niBreakdown.length === 0 && (
                        <p className="text-xs text-[var(--color-muted-foreground)] italic">Profit falls below National Insurance Lower Profit Limit.</p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Final Footer Result */}
              <div className="rounded-3xl bg-[var(--color-foreground)] p-10 text-white shadow-xl shadow-[var(--color-accent-soft)]">
                <div className="flex flex-col items-center justify-center text-center">
                   <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-60 mb-2">Grand Total Estimate</p>
                   <h2 className="text-5xl font-bold tracking-tighter mb-4">{formatAmount(taxSummary.estimatedTax.totalEstimatedTax, taxSummary.currency)}</h2>
                   <div className="flex items-center gap-4 text-white opacity-80 mt-2">
                       <span className="text-xs sm:text-sm">{taxSummary.estimatedTax.estimatedIncomeTax > 0 ? formatAmount(taxSummary.estimatedTax.estimatedIncomeTax, taxSummary.currency) + " Income Tax" : ""}</span>
                       <span className="h-1 w-1 rounded-full bg-white opacity-40 shrink-0" />
                       <span className="text-xs sm:text-sm">{taxSummary.estimatedTax.estimatedNationalInsurance > 0 ? formatAmount(taxSummary.estimatedTax.estimatedNationalInsurance, taxSummary.currency) + " National Insurance" : ""}</span>
                   </div>
                </div>
              </div>
            </section>
          )}

          {!taxSummary.estimatedTax && (
            <Card className="p-10 text-center border-dashed bg-[var(--color-panel)]">
               <Wallet className="mx-auto h-8 w-8 text-[var(--color-muted-foreground)] opacity-50 mb-4" />
               <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                 Estmate only available for Sole Traders. Small business mode displays accounting profit adjustments only.
               </p>
            </Card>
          )}

        </div>

        {/* RIGHT SIDEBAR: Supplementary Lists */}
        <div className="space-y-10">
          
          {/* Detailed Lists Summary */}
          <div className="space-y-6 sticky top-8">
             <div className="space-y-1">
               <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Tax Adjustments</h3>
               <p className="text-[10px] text-[var(--color-muted-foreground)]">Category-level claimability summary</p>
             </div>

             <div className="space-y-4">
                <TaxCategoryTable
                  title="Non-claimable"
                  description="Standard add-backs (HMRC rules)"
                  rows={taxSummary.nonClaimableCategories}
                  currency={taxSummary.currency}
                  tone="red"
                />

                <TaxCategoryTable
                  title="Partially claimable"
                  description="Items with limited relief"
                  rows={taxSummary.partiallyClaimableCategories}
                  currency={taxSummary.currency}
                  tone="amber"
                  showPercentage
                />
             </div>

             <div className="space-y-4 pt-6">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Accounting Context</h3>
                  <p className="text-[10px] text-[var(--color-muted-foreground)]">Reference figures for self-assessment</p>
                </div>
                <CategoryBreakdown
                  title="Income Mix"
                  rows={incomeRows}
                  currency={taxSummary.currency}
                />
                <CategoryBreakdown
                  title="Expense Mix"
                  rows={expenseRows}
                  currency={taxSummary.currency}
                />
             </div>

             {/* Disclaimer */}
             <Card className="bg-[var(--color-panel)] border-none shadow-none">
                <div className="flex gap-3">
                  <Info className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed text-[var(--color-muted-foreground)]">
                    This summary is a working estimate for UK self-assessment planning. It does not constitute formal tax advice and should not be used for filing without professional review. 2026/27 rates used for current calculations.
                  </p>
                </div>
             </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
