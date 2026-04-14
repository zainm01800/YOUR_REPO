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

/** A per-category line in the tax claimability breakdown */
export interface TaxCategoryLine {
  category: string;
  reportingBucket: string;
  /** Total net amount of this category (accounting view) */
  accountingAmount: number;
  /** Amount that reduces taxable profit */
  claimableAmount: number;
  /** Amount added back for tax (non-claimable) */
  nonClaimableAmount: number;
  /** % of expense allowable per HMRC rules */
  allowablePercentage: number;
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

export interface TaxBandBreakdown {
  band: string;
  rate: number;
  amount: number;
}

export interface EstimatedTaxSummary {
  taxYearLabel: string;
  taxableProfitStartingPoint: number;
  personalAllowanceUsed: number;
  taxableIncomeAfterAllowance: number;
  estimatedIncomeTax: number;
  incomeTaxBreakdown: TaxBandBreakdown[];
  estimatedNationalInsurance: number;
  niBreakdown: TaxBandBreakdown[];
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
    /** Sum of all adjustments to be ADDED BACK to profit (disallowed + uncategorized expenses - uncategorized income) */
    totalTaxAdjustments: number;
    /** Portion of expenses successfully claimed */
    totalClaimableExpenses: number;
    /** accountingProfit + totalTaxAdjustments */
    taxableProfit: number;
    /** Count of transactions currently in 'Uncategorised' state */
    uncategorizedCount: number;
    uncategorizedExpenses: number;
    uncategorizedIncome: number;
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
  /** Fully claimable expense categories */
  fullyClaimableCategories: TaxCategoryLine[];
  /** Partially claimable expense categories (0 < allowablePercentage < 100) */
  partiallyClaimableCategories: TaxCategoryLine[];
  /** Non-claimable expense categories (allowableForTax = false or allowablePercentage = 0) */
  nonClaimableCategories: TaxCategoryLine[];
  estimatedTax: EstimatedTaxSummary | null;
  assumptions: string[];
}

function estimateSoleTraderIncomeTax(taxableProfitAfterAllowance: number) {
  const breakdown: TaxBandBreakdown[] = [];
  if (taxableProfitAfterAllowance <= 0) {
    return { total: 0, breakdown };
  }

  const basicBand = UK_SOLE_TRADER_ESTIMATE_2026_27.basicRateLimit -
    UK_SOLE_TRADER_ESTIMATE_2026_27.personalAllowance;
  const higherBand =
    UK_SOLE_TRADER_ESTIMATE_2026_27.higherRateLimit -
    UK_SOLE_TRADER_ESTIMATE_2026_27.basicRateLimit;

  let remaining = taxableProfitAfterAllowance;
  let total = 0;

  const basicPortion = Math.min(remaining, basicBand);
  const basicTax = round2(basicPortion * UK_SOLE_TRADER_ESTIMATE_2026_27.basicRate);
  total += basicTax;
  breakdown.push({ band: "Basic Rate", rate: UK_SOLE_TRADER_ESTIMATE_2026_27.basicRate, amount: basicTax });
  remaining -= basicPortion;

  if (remaining > 0) {
    const higherPortion = Math.min(remaining, higherBand);
    const higherTax = round2(higherPortion * UK_SOLE_TRADER_ESTIMATE_2026_27.higherRate);
    total += higherTax;
    breakdown.push({ band: "Higher Rate", rate: UK_SOLE_TRADER_ESTIMATE_2026_27.higherRate, amount: higherTax });
    remaining -= higherPortion;
  }

  if (remaining > 0) {
    const additionalTax = round2(remaining * UK_SOLE_TRADER_ESTIMATE_2026_27.additionalRate);
    total += additionalTax;
    breakdown.push({ band: "Additional Rate", rate: UK_SOLE_TRADER_ESTIMATE_2026_27.additionalRate, amount: additionalTax });
  }

  return { total: round2(total), breakdown };
}

function estimateSoleTraderNationalInsurance(taxableProfit: number) {
  const breakdown: TaxBandBreakdown[] = [];
  if (taxableProfit <= UK_SOLE_TRADER_ESTIMATE_2026_27.class4LowerProfitsLimit) {
    return { total: 0, breakdown };
  }

  const mainBand =
    UK_SOLE_TRADER_ESTIMATE_2026_27.class4UpperProfitsLimit -
    UK_SOLE_TRADER_ESTIMATE_2026_27.class4LowerProfitsLimit;

  let remaining =
    taxableProfit - UK_SOLE_TRADER_ESTIMATE_2026_27.class4LowerProfitsLimit;
  let total = 0;

  const mainPortion = Math.min(remaining, mainBand);
  const mainNi = round2(mainPortion * UK_SOLE_TRADER_ESTIMATE_2026_27.class4MainRate);
  total += mainNi;
  breakdown.push({ band: "Class 4 Main Rate", rate: UK_SOLE_TRADER_ESTIMATE_2026_27.class4MainRate, amount: mainNi });
  remaining -= mainPortion;

  if (remaining > 0) {
    const additionalNi = round2(remaining * UK_SOLE_TRADER_ESTIMATE_2026_27.class4AdditionalRate);
    total += additionalNi;
    breakdown.push({ band: "Class 4 Additional Rate", rate: UK_SOLE_TRADER_ESTIMATE_2026_27.class4AdditionalRate, amount: additionalNi });
  }

  return { total: round2(total), breakdown };
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
  // ── Per-category tax claimability aggregation ─────────────────────────────
  // Only P&L expense transactions are relevant to tax allowability.
  // We EXCLUDE uncategorised items from the standard claimability flow so they can be alerted on.
  const allPnLTxs = classifiedTransactions.filter(
    (tx) => tx.statementType === "p_and_l",
  );
  
  const expensePnLTxs = allPnLTxs.filter(
    (tx) => tx.accountType === "expense" && tx.category !== "Uncategorised",
  );

  const uncategorizedTxs = allPnLTxs.filter(
    (tx) => tx.category === "Uncategorised",
  );

  const uncategorizedExpenses = round2(
    uncategorizedTxs
      .filter(tx => tx.accountType === "expense")
      .reduce((s, tx) => s + tx.netAmount, 0)
  );
  
  const uncategorizedIncome = round2(
    uncategorizedTxs
      .filter(tx => tx.accountType === "income")
      .reduce((s, tx) => s + tx.netAmount, 0)
  );

  const uncategorizedCount = uncategorizedTxs.length;

  interface CategoryAgg {
    category: string;
    reportingBucket: string;
    accountingAmount: number;
    claimableAmount: number;
    nonClaimableAmount: number;
    allowablePercentage: number;
    transactionCount: number;
  }

  const categoryMap = new Map<string, CategoryAgg>();
  for (const tx of expensePnLTxs) {
    const existing = categoryMap.get(tx.category);
    if (existing) {
      existing.accountingAmount = round2(existing.accountingAmount + tx.netAmount);
      existing.claimableAmount = round2(existing.claimableAmount + tx.allowableAmount);
      existing.nonClaimableAmount = round2(existing.nonClaimableAmount + tx.disallowedAmount);
      existing.transactionCount += 1;
    } else {
      categoryMap.set(tx.category, {
        category: tx.category,
        reportingBucket: tx.reportingBucket,
        accountingAmount: tx.netAmount,
        claimableAmount: tx.allowableAmount,
        nonClaimableAmount: tx.disallowedAmount,
        allowablePercentage: tx.allowablePercentage,
        transactionCount: 1,
      });
    }
  }

  const allCategoryLines: TaxCategoryLine[] = Array.from(categoryMap.values());

  // Classify into fully / partially / non-claimable
  const fullyClaimableCategories: TaxCategoryLine[] = [];
  const partiallyClaimableCategories: TaxCategoryLine[] = [];
  const nonClaimableCategories: TaxCategoryLine[] = [];

  for (const line of allCategoryLines) {
    if (line.nonClaimableAmount <= 0) {
      fullyClaimableCategories.push(line);
    } else if (line.claimableAmount > 0) {
      partiallyClaimableCategories.push(line);
    } else {
      nonClaimableCategories.push(line);
    }
  }

  fullyClaimableCategories.sort((a, b) => b.claimableAmount - a.claimableAmount);
  partiallyClaimableCategories.sort((a, b) => b.accountingAmount - a.accountingAmount);
  nonClaimableCategories.sort((a, b) => b.nonClaimableAmount - a.nonClaimableAmount);

  // ── Disallowed expense add-backs (legacy TaxAdjustment format) ──────────────
  const adjustmentMap = new Map<string, TaxAdjustment>();
  for (const tx of expensePnLTxs) {
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
  const totalClaimableExpenses = round2(
    allCategoryLines.reduce((s, c) => s + c.claimableAmount, 0),
  );

  const accountingProfit = round2(pnl.netProfit);
  
  // Tax adjustments bridge:
  // We starting from accounting profit.
  // We ADD BACK:
  // 1. Disallowed portions of categorised expenses
  // 2. ALL uncategorised expenses (safe assumption for tax until reviewed)
  // We SUBTRACT (if needed):
  // 1. Any uncategorised income (actually it's already in the income total, but we need to ensure consistency)
  //
  // Logically: Taxable Profit = Accounting Profit + Disallowed Categorised + Uncategorised Expenses
  // (Assuming uncategorised income is already in accounting profit).
  const totalTaxAdjustments = round2(totalDisallowed + uncategorizedExpenses);
  const taxableProfit = round2(Math.max(accountingProfit + totalTaxAdjustments, 0));

  const assumptions = [
    "Accounting profit is adjusted by adding back non-claimable items and uncategorised expenses.",
    "Uncategorised expenses are temporarily excluded from relief until categorised.",
    "Uncategorised income (if any) is included in total income and taxable profit.",
    "Recoverable VAT is excluded from both accounting and taxable profit figures.",
  ];

  let estimatedTax: EstimatedTaxSummary | null = null;

  if (businessType === "sole_trader") {
    const personalAllowanceUsed = Math.min(
      taxableProfit,
      UK_SOLE_TRADER_ESTIMATE_2026_27.personalAllowance,
    );
    const taxableIncomeAfterAllowance = round2(
      Math.max(
        taxableProfit - UK_SOLE_TRADER_ESTIMATE_2026_27.personalAllowance,
        0,
      ),
    );
    const { total: estimatedIncomeTax, breakdown: incomeTaxBreakdown } = estimateSoleTraderIncomeTax(taxableIncomeAfterAllowance);
    const { total: estimatedNationalInsurance, breakdown: niBreakdown } = estimateSoleTraderNationalInsurance(taxableProfit);

    estimatedTax = {
      taxYearLabel: UK_SOLE_TRADER_ESTIMATE_2026_27.taxYearLabel,
      taxableProfitStartingPoint: taxableProfit,
      personalAllowanceUsed: round2(personalAllowanceUsed),
      taxableIncomeAfterAllowance,
      estimatedIncomeTax,
      incomeTaxBreakdown,
      estimatedNationalInsurance,
      niBreakdown,
      totalEstimatedTax: round2(estimatedIncomeTax + estimatedNationalInsurance),
      assumptions: [
        "Sole trader estimate using 2026/27 UK bands.",
        "National Insurance Class 4 rates applied.",
      ],
    };
  }

  const totalExpenses = round2(pnl.expenseSection.netTotal);

  return {
    businessType,
    currency,
    profitSummary: {
      totalIncome: round2(pnl.incomeSection.netTotal),
      totalExpenses,
      accountingProfit,
      totalTaxAdjustments,
      totalClaimableExpenses,
      taxableProfit,
      uncategorizedCount,
      uncategorizedExpenses,
      uncategorizedIncome,
    },
    vatSummary: {
      enabled: vatReport.isVatRegistered,
      outputVat: round2(vatReport.outputTax),
      inputVat: round2(vatReport.inputTaxRecoverable),
      nonRecoverableVat: round2(vatReport.inputTaxNonRecoverable),
      netVatPosition: round2(vatReport.netVatPosition),
    },
    taxAdjustments,
    fullyClaimableCategories,
    partiallyClaimableCategories,
    nonClaimableCategories,
    estimatedTax,
    assumptions,
  };
}
