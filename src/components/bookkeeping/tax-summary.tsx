"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Download, Info, MinusCircle, Wallet, XCircle, LayoutDashboard, Receipt, Calculator, ArrowRight, AlertTriangle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PnLReport, VatReport } from "@/lib/accounting/reports";
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
    ["Tax add-backs (Adjustments)", taxSummary.profitSummary.totalTaxAdjustments.toFixed(2)],
    ["Taxable profit", taxSummary.profitSummary.taxableProfit.toFixed(2)],
    [],
    ["VAT Summary"],
    ["VAT enabled", taxSummary.vatSummary.enabled ? "Yes" : "No"],
    ["Output VAT", taxSummary.vatSummary.outputVat.toFixed(2)],
    ["Input VAT", taxSummary.vatSummary.inputVat.toFixed(2)],
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
        ["Total Income tax", taxSummary.estimatedTax.estimatedIncomeTax.toFixed(2)],
        ["Total National Insurance", taxSummary.estimatedTax.estimatedNationalInsurance.toFixed(2)],
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

function SummaryCard({
  label,
  value,
  tone = "default",
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone?: "default" | "profit" | "expense" | "warning";
  description?: string;
  icon?: any;
}) {
  const toneClass =
    tone === "profit"
      ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
      : tone === "expense"
        ? "bg-orange-50/50 border-orange-100 text-orange-900"
        : tone === "warning"
          ? "bg-amber-50/50 border-amber-100 text-amber-900"
          : "bg-white border-slate-200 text-slate-900";

  return (
    <Card className={`rounded-3xl border p-6 transition-all hover:shadow-md ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">{label}</p>
        {Icon && <Icon className="h-4 w-4 opacity-40" />}
      </div>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tighter">{value}</p>
      {description && <p className="mt-2 text-[10px] font-semibold opacity-60 uppercase tracking-widest">{description}</p>}
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

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center text-slate-400">
         <p className="text-sm font-medium">{title}: None detected</p>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <div className={`px-6 py-4 border-b border-slate-200 ${headerClass}`}>
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="text-sm font-bold">{title}</h3>
            <p className="text-[10px] opacity-75">{description}</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-right">Accounting</th>
              {showPercentage && <th className="px-6 py-3 text-right">% Claim</th>}
              <th className="px-6 py-3 text-right">Claimable</th>
              <th className="px-6 py-3 text-right">Add-back</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.category} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{row.category}</td>
                <td className="px-6 py-4 text-right font-mono text-slate-500">{formatAmount(row.accountingAmount, currency)}</td>
                {showPercentage && <td className="px-6 py-4 text-right font-mono text-slate-500">{row.allowablePercentage}%</td>}
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">{formatAmount(row.claimableAmount, currency)}</td>
                <td className="px-6 py-4 text-right font-mono font-bold text-amber-600">
                  {row.nonClaimableAmount > 0 ? `+${formatAmount(row.nonClaimableAmount, currency)}` : "—"}
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
  const [activeTab, setActiveTab] = useState("overview");

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
    <div className="space-y-8 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">
             <Calculator className="h-3 w-3" />
             Fiscal Engine 2026/27
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-slate-900 sm:text-5xl">
            Tax Summary
          </h1>
          <p className="max-w-xl text-lg text-slate-500 leading-relaxed">
            A precise reconciliation of your accounting books for HMRC self-assessment, adjusting for claimability and thresholds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Reporting Window</span>
            <select
              value={selectedPeriod ?? "all"}
              onChange={(e) => updatePeriod(e.target.value)}
              disabled={isPending}
              className="h-11 min-w-[200px] cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 shadow-sm transition-all hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Cumulative All-time</option>
              {periodOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button
            onClick={exportSummary}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-900 transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 gap-1 h-auto flex-wrap">
          <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            <Receipt className="h-4 w-4 mr-2" />
            Adjustments & Add-backs
          </TabsTrigger>
          {taxSummary.estimatedTax && (
            <TabsTrigger value="taxbill" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
              <Calculator className="h-4 w-4 mr-2" />
              Tax Bill Detail
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-12">
          {/* Top Level KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <SummaryCard label="Accounting Profit" value={formatAmount(taxSummary.profitSummary.accountingProfit, taxSummary.currency)} icon={LayoutDashboard} description="Your net P&L position" />
             <SummaryCard label="Tax Add-backs" value={formatAmount(taxSummary.profitSummary.totalTaxAdjustments, taxSummary.currency)} tone="warning" icon={Receipt} description="Non-claimable items" />
             <SummaryCard label="Taxable Profit" value={formatAmount(taxSummary.profitSummary.taxableProfit, taxSummary.currency)} tone="profit" icon={Calculator} description="Final HMRC-ready figure" />
             <SummaryCard 
               label="Est. Liability" 
               value={taxSummary.estimatedTax ? formatAmount(taxSummary.estimatedTax.totalEstimatedTax, taxSummary.currency) : "—"} 
               tone={taxSummary.estimatedTax ? "warning" : "default"}
               icon={Wallet} 
               description="Projected tax due"
             />
          </div>

          {/* Reconciliation Bridge */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-blue-600 rounded-full" />
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Profit Reconciliation</h2>
            </div>
            
            <div className="relative grid gap-8 lg:grid-cols-3">
               <Card className="p-8 border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">P&L Net Profit</p>
                  <p className="text-4xl font-mono font-bold tracking-tighter text-slate-900">{formatAmount(taxSummary.profitSummary.accountingProfit, taxSummary.currency)}</p>
               </Card>

               <div className="flex items-center justify-center -my-4 lg:my-0">
                  <div className="flex flex-col items-center gap-2">
                     <span className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-400">
                        <ArrowRight className="h-5 w-5 transform rotate-90 lg:rotate-0" />
                     </span>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adjustments</p>
                  </div>
               </div>

               <Card className="p-8 border-slate-200 bg-slate-900 text-white shadow-xl flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 underline decoration-orange-500 decoration-2 underline-offset-4">HMRC Taxable Profit</p>
                  <p className="text-4xl font-mono font-bold tracking-tighter text-white">{formatAmount(taxSummary.profitSummary.taxableProfit, taxSummary.currency)}</p>
               </Card>
            </div>

            <Card className="bg-slate-50/50 border-slate-200 p-8">
               <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-4">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">How we reached this</h3>
                     <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm py-2 border-b border-slate-200/50">
                           <span className="text-slate-600">Categorised Income</span>
                           <span className="font-mono text-slate-900">{formatAmount(taxSummary.profitSummary.totalIncome, taxSummary.currency)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-2 border-b border-slate-200/50">
                           <span className="text-slate-600">Claimable Expenses</span>
                           <span className="font-mono text-orange-700">-{formatAmount(taxSummary.profitSummary.totalClaimableExpenses, taxSummary.currency)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold pt-2">
                           <span>Taxable Total</span>
                           <span className="font-mono text-emerald-800">{formatAmount(taxSummary.profitSummary.taxableProfit, taxSummary.currency)}</span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Excluded (Added Back)</h3>
                     <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm py-2 border-b border-slate-200/50">
                           <span className="text-slate-600">Disallowed Expenses</span>
                           <span className="font-mono text-slate-900">+{formatAmount(taxSummary.profitSummary.totalTaxAdjustments - taxSummary.profitSummary.uncategorizedExpenses, taxSummary.currency)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-2 border-b border-slate-200/50">
                           <span className="text-slate-600">Uncategorised Expenses</span>
                           <span className="font-mono text-slate-900">+{formatAmount(taxSummary.profitSummary.uncategorizedExpenses, taxSummary.currency)}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">These items increase taxable profit as they aren't eligible for relief.</p>
                     </div>
                  </div>
               </div>
            </Card>
          </div>
          
          {taxSummary.profitSummary.uncategorizedCount > 0 && (
            <Card className="border-amber-200 bg-amber-50/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-start gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                     <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-amber-900 font-bold">Incomplete Data Detected</h3>
                    <p className="text-sm text-amber-800/70 mt-1 max-w-lg">
                      There are <strong>{taxSummary.profitSummary.uncategorizedCount} transactions</strong> needing review.
                      To be safe, these are currently <strong>not</strong> being used to reduce your tax bill.
                    </p>
                  </div>
               </div>
               <button 
                onClick={() => router.push('/bookkeeping/transactions')}
                className="h-11 px-6 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl whitespace-nowrap transition-colors"
               >
                 Review Transactions
               </button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-12">
          <div className="grid gap-8 lg:grid-cols-2">
             <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Expense Adjustments</h2>
                  <p className="text-sm text-slate-500">Breakdown of items flagged for limited or zero tax relief.</p>
                </div>
                <TaxCategoryTable 
                  title="Partially Claimable" 
                  description="Relief limited to a percentage (e.g. usage split)"
                  rows={taxSummary.partiallyClaimableCategories}
                  currency={taxSummary.currency}
                  tone="amber"
                  showPercentage
                />
                <TaxCategoryTable 
                  title="Fully Non-claimable" 
                  description="Standard HMRC add-backs (e.g. entertaining)"
                  rows={taxSummary.nonClaimableCategories}
                  currency={taxSummary.currency}
                  tone="red"
                />
             </div>

             <div className="space-y-6">
                <div className="space-y-1">
                   <h2 className="text-xl font-bold tracking-tight text-slate-900">Uncategorised Items</h2>
                   <p className="text-sm text-slate-500">Transactions still pending review that impact the estimate.</p>
                </div>
                <Card className="p-8 border-slate-200 space-y-6">
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Expenses</p>
                        <p className="text-3xl font-mono font-bold text-slate-900">{formatAmount(taxSummary.profitSummary.uncategorizedExpenses, taxSummary.currency)}</p>
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                        <Info className="h-6 w-6" />
                      </div>
                   </div>
                   <div className="p-4 rounded-2xl bg-slate-100/50 text-xs text-slate-500 leading-relaxed border border-slate-200/50">
                      Uncategorised expenses are "safety excluded" from claimable totals. Once categorised as a valid business expense, they will reduce your taxable profit and lower your estimated tax.
                   </div>
                   <button 
                     onClick={() => router.push('/bookkeeping/transactions')}
                     className="w-full h-12 border border-slate-200 hover:bg-slate-50 font-bold rounded-xl transition-all"
                   >
                     Go to Bookkeeping
                   </button>
                </Card>
             </div>
          </div>
        </TabsContent>

        <TabsContent value="taxbill" className="space-y-12">
          {taxSummary.estimatedTax && (
            <>
              {/* Grand Total Hero */}
              <div className="relative overflow-hidden rounded-[40px] bg-slate-900 p-12 text-white shadow-2xl">
                 <div className="relative z-10 flex flex-col items-center text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40 mb-4">Total Estimated Liability</p>
                    <h2 className="text-6xl font-bold tracking-tighter mb-6">{formatAmount(taxSummary.estimatedTax.totalEstimatedTax, taxSummary.currency)}</h2>
                    <div className="flex flex-wrap justify-center gap-4">
                       <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold">
                          {formatAmount(taxSummary.estimatedTax.estimatedIncomeTax, taxSummary.currency)} Income Tax
                       </div>
                       <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold">
                          {formatAmount(taxSummary.estimatedTax.estimatedNationalInsurance, taxSummary.currency)} Class 4 NI
                       </div>
                    </div>
                 </div>
                 {/* Subtle decorative elements */}
                 <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                 <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                 <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 px-1">Income Tax Breakdown</h3>
                    <Card className="divide-y divide-slate-100 border-slate-200 overflow-hidden shadow-sm">
                       <div className="p-6 bg-slate-50/50 flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Taxable Income Base</span>
                          <span className="font-mono font-bold text-slate-900">{formatAmount(taxSummary.estimatedTax.taxableProfitStartingPoint, taxSummary.currency)}</span>
                       </div>
                       <div className="p-6 flex justify-between items-center">
                          <div className="space-y-1">
                             <p className="text-sm font-medium text-slate-900">Personal Allowance</p>
                             <p className="text-[10px] text-slate-400">Standard 2026/27 threshold</p>
                          </div>
                          <span className="font-mono font-bold text-emerald-700">-{formatAmount(taxSummary.estimatedTax.personalAllowanceUsed, taxSummary.currency)}</span>
                       </div>
                       <div className="p-6 space-y-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Applicable Bands</p>
                          {taxSummary.estimatedTax.incomeTaxBreakdown.map(band => (
                            <div key={band.band} className="flex justify-between items-center text-sm py-1">
                                <span className="text-slate-600">{band.band} ({Math.round(band.rate * 100)}%)</span>
                                <span className="font-mono font-bold text-slate-900">{formatAmount(band.amount, taxSummary.currency)}</span>
                            </div>
                          ))}
                          {taxSummary.estimatedTax.incomeTaxBreakdown.length === 0 && (
                             <p className="text-xs text-slate-400 italic">Income falls within allowance.</p>
                          )}
                       </div>
                    </Card>
                 </div>

                 <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 px-1">National Insurance Detail</h3>
                    <Card className="divide-y divide-slate-100 border-slate-200 overflow-hidden shadow-sm">
                       <div className="p-6 bg-slate-50/50 flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">NI Assessment Base</span>
                          <span className="font-mono font-bold text-slate-900">{formatAmount(taxSummary.estimatedTax.taxableProfitStartingPoint, taxSummary.currency)}</span>
                       </div>
                       <div className="p-6 space-y-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Class 4 NI Bands</p>
                          {taxSummary.estimatedTax.niBreakdown.map(band => (
                            <div key={band.band} className="flex justify-between items-center text-sm py-1">
                                <span className="text-slate-600">{band.band} ({Math.round(band.rate * 100)}%)</span>
                                <span className="font-mono font-bold text-slate-900">{formatAmount(band.amount, taxSummary.currency)}</span>
                            </div>
                          ))}
                          {taxSummary.estimatedTax.niBreakdown.length === 0 && (
                             <p className="text-xs text-slate-400 italic">Profit below lower limit.</p>
                          )}
                       </div>
                    </Card>
                 </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className="pt-10 border-t border-slate-200">
         <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-4">
               <div className="flex items-center gap-2 text-slate-400">
                  <Info className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-[0.1em]">Assumptions & Methodology</span>
               </div>
               <div className="grid gap-3 sm:grid-cols-2">
                  {taxSummary.assumptions.map((a, i) => (
                    <div key={i} className="flex gap-3 text-[11px] text-slate-500 leading-relaxed italic">
                       <span className="opacity-30">•</span>
                       {a}
                    </div>
                  ))}
               </div>
            </div>
            <Card className="p-6 bg-slate-50 border-slate-100 max-w-sm text-[10px] text-slate-400 italic leading-relaxed">
               Disclaimer: This tool provides a working estimate for planning purposes. It does not constitute formal tax advice. Always verify your final self-assessment filing with HMRC or a qualified professional accountant.
            </Card>
         </div>
      </div>
    </div>
  );
}

