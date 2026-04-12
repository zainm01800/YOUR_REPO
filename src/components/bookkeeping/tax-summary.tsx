"use client";

import { useMemo, useTransition } from "react";
import { Download, Info, Wallet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import type { PnLReport, VatReport } from "@/lib/accounting/reports";
import type { TaxSummaryReport, TaxAdjustment } from "@/lib/accounting/tax-summary";

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
    ["Profit summary"],
    ["Total income", taxSummary.profitSummary.totalIncome.toFixed(2)],
    ["Total expenses (P&L)", taxSummary.profitSummary.totalExpenses.toFixed(2)],
    ["Accounting profit", taxSummary.profitSummary.accountingProfit.toFixed(2)],
    ["Disallowed expenses (add-back)", taxSummary.profitSummary.disallowedExpenses.toFixed(2)],
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
      ["Estimated sole trader tax"],
      ["Tax year", taxSummary.estimatedTax.taxYearLabel],
      ["Taxable profit starting point", taxSummary.estimatedTax.taxableProfitStartingPoint.toFixed(2)],
      ["Personal allowance used", taxSummary.estimatedTax.personalAllowanceUsed.toFixed(2)],
      ["Taxable income after allowance", taxSummary.estimatedTax.taxableIncomeAfterAllowance.toFixed(2)],
      ["Estimated income tax", taxSummary.estimatedTax.estimatedIncomeTax.toFixed(2)],
      ["Estimated National Insurance", taxSummary.estimatedTax.estimatedNationalInsurance.toFixed(2)],
      ["Total estimated tax", taxSummary.estimatedTax.totalEstimatedTax.toFixed(2)],
    );
  }

  if (taxSummary.taxAdjustments.length > 0) {
    rows.push(
      [],
      ["Disallowed expense add-backs"],
      ["Bucket", "Category", "Transactions", "Add-back amount"],
    );
    for (const adj of taxSummary.taxAdjustments) {
      rows.push([adj.reportingBucket, adj.category, String(adj.transactionCount), adj.disallowedAmount.toFixed(2)]);
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
  rows: Array<{ label: string; value: number; tone?: "default" | "strong" }>;
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
                  row.tone === "strong" ? "font-bold text-[var(--color-foreground)]" : "text-[var(--color-foreground)]"
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
          Built from categorised bookkeeping transactions, not raw bank lines.
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
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Bucket
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Category
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Txns
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.bucket}-${row.category}`} className={index > 0 ? "border-t border-[var(--color-border)]" : ""}>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{row.bucket}</td>
                  <td className="px-4 py-3 text-[var(--color-foreground)]">{row.category}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-muted-foreground)]">{row.count}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-foreground)]">
                    {formatAmount(row.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function DisallowedBreakdown({
  title,
  adjustments,
  currency,
}: {
  title: string;
  adjustments: TaxAdjustment[];
  currency: string;
}) {
  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          These expenses appear in the P&L but are added back for tax purposes.
        </p>
      </div>

      {adjustments.length === 0 ? (
        <div className="rounded-2xl bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
          No disallowed expenses for this period.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-panel)]">
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Bucket
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Category
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Txns
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Add-back
                </th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((row, index) => (
                <tr
                  key={`${row.reportingBucket}-${row.category}`}
                  className={index > 0 ? "border-t border-[var(--color-border)]" : ""}
                >
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{row.reportingBucket}</td>
                  <td className="px-4 py-3 text-[var(--color-foreground)]">{row.category}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-muted-foreground)]">{row.transactionCount}</td>
                  <td className="px-4 py-3 text-right font-mono text-amber-700">
                    + {formatAmount(row.disallowedAmount, currency)}
                  </td>
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

  return (
    <div className="space-y-6">
      <Card className="space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              Tax summary
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">
              Practical profit, VAT, and estimated tax figures for manual tax preparation
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              These figures are built from categorised bookkeeping data and are provided to help
              the user prepare tax work manually. They are estimates and summaries only, not tax
              authority submissions or filing outputs.
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          <TaxSection
            title="Profit summary"
            currency={taxSummary.currency}
            rows={[
              {
                label: "Total income",
                value: taxSummary.profitSummary.totalIncome,
              },
              {
                label: "Total expenses (P&L)",
                value: taxSummary.profitSummary.totalExpenses,
              },
              {
                label: "Accounting profit",
                value: taxSummary.profitSummary.accountingProfit,
                tone: "strong",
              },
              ...(taxSummary.profitSummary.disallowedExpenses > 0
                ? [
                    {
                      label: "Add: disallowed expenses",
                      value: taxSummary.profitSummary.disallowedExpenses,
                    },
                  ]
                : []),
            ]}
            footer={{
              label: "Taxable profit",
              value: taxSummary.profitSummary.taxableProfit,
            }}
          />

          <TaxSection
            title="VAT summary"
            currency={taxSummary.currency}
            rows={
              taxSummary.vatSummary.enabled
                ? [
                    { label: "Output VAT", value: taxSummary.vatSummary.outputVat },
                    { label: "Input VAT", value: taxSummary.vatSummary.inputVat },
                    {
                      label: "Non-recoverable VAT",
                      value: taxSummary.vatSummary.nonRecoverableVat,
                    },
                  ]
                : [{ label: "VAT registration", value: 0 }]
            }
            footer={
              taxSummary.vatSummary.enabled
                ? {
                    label:
                      taxSummary.vatSummary.netVatPosition >= 0
                        ? "Net VAT due"
                        : "Net VAT reclaimable",
                    value: Math.abs(taxSummary.vatSummary.netVatPosition),
                  }
                : undefined
            }
          />

          {taxSummary.estimatedTax ? (
            <TaxSection
              title={`Estimated tax summary (${taxSummary.estimatedTax.taxYearLabel})`}
              currency={taxSummary.currency}
              rows={[
                {
                  label: "Taxable profit",
                  value: taxSummary.estimatedTax.taxableProfitStartingPoint,
                },
                {
                  label: "Personal allowance used",
                  value: taxSummary.estimatedTax.personalAllowanceUsed,
                },
                {
                  label: "Taxable income after allowance",
                  value: taxSummary.estimatedTax.taxableIncomeAfterAllowance,
                },
                {
                  label: "Estimated Income Tax",
                  value: taxSummary.estimatedTax.estimatedIncomeTax,
                },
                {
                  label: "Estimated National Insurance",
                  value: taxSummary.estimatedTax.estimatedNationalInsurance,
                },
              ]}
              footer={{
                label: "Total estimated tax",
                value: taxSummary.estimatedTax.totalEstimatedTax,
              }}
            />
          ) : (
            <Card className="space-y-4">
              <div className="flex items-start gap-3">
                <Wallet className="mt-0.5 h-5 w-5 text-[var(--color-accent)]" />
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                    Estimated tax summary
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    Owner-level tax is only estimated in sole trader mode. General small business
                    mode stays focused on profit and VAT working figures.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <CategoryBreakdown
            title="Income by category"
            rows={incomeRows}
            currency={taxSummary.currency}
          />

          <CategoryBreakdown
            title="Expenses by category"
            rows={expenseRows}
            currency={taxSummary.currency}
          />

          <DisallowedBreakdown
            title="Disallowed expense add-backs"
            adjustments={taxSummary.taxAdjustments}
            currency={taxSummary.currency}
          />

          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-[var(--color-accent)]" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                  Assumptions and disclaimer
                </h3>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  These figures are meant to help with manual tax preparation. They are not filing
                  outputs and they do not cover every local tax scenario.
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
                  VAT is disabled in this workspace, so VAT calculations are omitted from the
                  working estimate.
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
