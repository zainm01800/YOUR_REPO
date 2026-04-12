import type { BusinessType } from "@/lib/domain/types";
import type { PnLReport, VatReport } from "@/lib/accounting/reports";
import type { ClassifiedTransaction } from "@/lib/accounting/classifier";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/** A single disallowed-expense add-back line (per category) */
export interface TaxAdjustment {
  category: string;
  reportingBucket: string;
  disallowedAmount: number;
  transactionCount: number;
}

export const UK_SOLE_TRADER_ESTIMATE_2026_27 = {
  taxYearLabel: "2026/27",
  personalAllowance: 12_570,
  basicRateLimit: 50_270,
  higherRateLimit: 125_140,
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,
  class4LowerProfitsLimit: 12_570,
  class4UpperProfitsLimit: 50_270,
  class4MainRate: 0.06,
  class4AdditionalRate: 0.02,
};

export interface EstimatedTaxSummary {
  taxYearLabel: string;
  taxableProfitStartingPoint: number;
  personalAllowanceUsed: number;
  taxableIncomeAfterAllowance: number;
  estimatedIncomeTax: number;
  estimatedNationalInsurance: number;
  totalEstimatedTax: number;
  assumptions: string[];
}

export interface TaxSummaryReport {
  businessType: BusinessType;
  currency: string;
  profitSummary: {
    totalIncome: number;
    /** Total of ALL P&L expenses (allowable + disallowed) */
    totalExpenses: number;
    /** Income minus all expenses — the accounting P&L figure */
    accountingProfit: number;
    /** Sum of disallowed expense amounts to be added back */
    disallowedExpenses: number;
    /** accountingProfit + disallowedExpenses — used for tax estimation */
    taxableProfit: number;
    /** @deprecated use taxableProfit */
    allowableExpenses: number;
    /** @deprecated use taxableProfit */
    netProfit: number;
    /** @deprecated use taxableProfit */
    taxableProfitStartingPoint: number;
  };
  vatSummary: {
    enabled: boolean;
    outputVat: number;
    inputVat: number;
    nonRecoverableVat: number;
    netVatPosition: number;
  };
  /** Per-category breakdown of disallowed add-backs, sorted by disallowedAmount desc */
  taxAdjustments: TaxAdjustment[];
  estimatedTax: EstimatedTaxSummary | null;
  assumptions: string[];
}

function estimateSoleTraderIncomeTax(taxableProfitAfterAllowance: number) {
  if (taxableProfitAfterAllowance <= 0) {
    return 0;
  }

  const basicBand = UK_SOLE_TRADER_ESTIMATE_2026_27.basicRateLimit -
    UK_SOLE_TRADER_ESTIMATE_2026_27.personalAllowance;
  const higherBand =
    UK_SOLE_TRADER_ESTIMATE_2026_27.higherRateLimit -
    UK_SOLE_TRADER_ESTIMATE_2026_27.basicRateLimit;

  let remaining = taxableProfitAfterAllowance;
  let total = 0;

  const basicPortion = Math.min(remaining, basicBand);
  total += basicPortion * UK_SOLE_TRADER_ESTIMATE_2026_27.basicRate;
  remaining -= basicPortion;

  if (remaining > 0) {
    const higherPortion = Math.min(remaining, higherBand);
    total += higherPortion * UK_SOLE_TRADER_ESTIMATE_2026_27.higherRate;
    remaining -= higherPortion;
  }

  if (remaining > 0) {
    total += remaining * UK_SOLE_TRADER_ESTIMATE_2026_27.additionalRate;
  }

  return round2(total);
}

function estimateSoleTraderNationalInsurance(taxableProfit: number) {
  if (taxableProfit <= UK_SOLE_TRADER_ESTIMATE_2026_27.class4LowerProfitsLimit) {
    return 0;
  }

  const mainBand =
    UK_SOLE_TRADER_ESTIMATE_2026_27.class4UpperProfitsLimit -
    UK_SOLE_TRADER_ESTIMATE_2026_27.class4LowerProfitsLimit;

  let remaining =
    taxableProfit - UK_SOLE_TRADER_ESTIMATE_2026_27.class4LowerProfitsLimit;
  let total = 0;

  const mainPortion = Math.min(remaining, mainBand);
  total += mainPortion * UK_SOLE_TRADER_ESTIMATE_2026_27.class4MainRate;
  remaining -= mainPortion;

  if (remaining > 0) {
    total += remaining * UK_SOLE_TRADER_ESTIMATE_2026_27.class4AdditionalRate;
  }

  return round2(total);
}

export function buildTaxSummaryReport({
  pnl,
  vatReport,
  businessType,
  currency,
  classifiedTransactions = [],
}: {
  pnl: PnLReport;
  vatReport: VatReport;
  businessType: BusinessType;
  currency: string;
  classifiedTransactions?: ClassifiedTransaction[];
}): TaxSummaryReport {
  // ── Disallowed expense add-backs ───────────────────────────────────────────
  // Aggregate disallowed amounts per category (only P&L expenses matter)
  const adjustmentMap = new Map<string, TaxAdjustment>();
  for (const tx of classifiedTransactions) {
    if (tx.disallowedAmount <= 0) continue;
    const existing = adjustmentMap.get(tx.category);
    if (existing) {
      existing.disallowedAmount = round2(existing.disallowedAmount + tx.disallowedAmount);
      existing.transactionCount += 1;
    } else {
      adjustmentMap.set(tx.category, {
        category: tx.category,
        reportingBucket: tx.reportingBucket,
        disallowedAmount: tx.disallowedAmount,
        transactionCount: 1,
      });
    }
  }
  const taxAdjustments = Array.from(adjustmentMap.values()).sort(
    (a, b) => b.disallowedAmount - a.disallowedAmount,
  );
  const totalDisallowed = round2(taxAdjustments.reduce((s, a) => s + a.disallowedAmount, 0));

  const accountingProfit = round2(pnl.netProfit);
  const taxableProfit = round2(Math.max(accountingProfit + totalDisallowed, 0));
  // For backward compat keep taxableProfitStartingPoint = taxableProfit
  const taxableProfitStartingPoint = taxableProfit;
  const assumptions = [
    "Built from categorised bookkeeping transactions rather than raw bank lines.",
    "Uses Profit & Loss net amounts, so recoverable VAT is excluded from allowable expense totals.",
    "Figures are estimates for manual tax preparation and are not filing outputs.",
  ];

  let estimatedTax: EstimatedTaxSummary | null = null;

  if (businessType === "sole_trader") {
    const personalAllowanceUsed = Math.min(
      taxableProfitStartingPoint,
      UK_SOLE_TRADER_ESTIMATE_2026_27.personalAllowance,
    );
    const taxableIncomeAfterAllowance = round2(
      Math.max(
        taxableProfitStartingPoint - UK_SOLE_TRADER_ESTIMATE_2026_27.personalAllowance,
        0,
      ),
    );
    const estimatedIncomeTax = estimateSoleTraderIncomeTax(taxableIncomeAfterAllowance);
    const estimatedNationalInsurance =
      estimateSoleTraderNationalInsurance(taxableProfitStartingPoint);

    estimatedTax = {
      taxYearLabel: UK_SOLE_TRADER_ESTIMATE_2026_27.taxYearLabel,
      taxableProfitStartingPoint,
      personalAllowanceUsed: round2(personalAllowanceUsed),
      taxableIncomeAfterAllowance,
      estimatedIncomeTax,
      estimatedNationalInsurance,
      totalEstimatedTax: round2(estimatedIncomeTax + estimatedNationalInsurance),
      assumptions: [
        "UK sole trader estimate using the 2026/27 personal allowance and headline UK basic / higher / additional income tax bands.",
        "National Insurance estimate uses Class 4 self-employed style thresholds and rates only.",
        "No adjustments are made for student loans, pensions, marriage allowance, dividends, employment income, or other personal tax factors.",
        "This specific estimate is UK-oriented; other markets should treat it as an optional planning aid rather than a local tax calculation.",
      ],
    };
  } else {
    assumptions.push(
      "General small business mode does not estimate owner-level income tax or Corporation Tax.",
    );
  }

  const totalExpenses = round2(pnl.expenseSection.netTotal);
  const allowableExpenses = round2(totalExpenses - totalDisallowed);

  return {
    businessType,
    currency,
    profitSummary: {
      totalIncome: round2(pnl.incomeSection.netTotal),
      totalExpenses,
      accountingProfit,
      disallowedExpenses: totalDisallowed,
      taxableProfit,
      // deprecated aliases kept for backward compat
      allowableExpenses,
      netProfit: accountingProfit,
      taxableProfitStartingPoint,
    },
    vatSummary: {
      enabled: vatReport.isVatRegistered,
      outputVat: round2(vatReport.outputTax),
      inputVat: round2(vatReport.inputTaxRecoverable),
      nonRecoverableVat: round2(vatReport.inputTaxNonRecoverable),
      netVatPosition: round2(vatReport.netVatPosition),
    },
    taxAdjustments,
    estimatedTax,
    assumptions,
  };
}
