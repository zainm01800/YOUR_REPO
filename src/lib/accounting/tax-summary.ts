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
  /** Income above this starts tapering the personal allowance (£1 lost per £2 above) */
  personalAllowanceTaperThreshold: 100_000,
  basicRateLimit: 50_270,
  higherRateLimit: 125_140,
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,
  class4LowerProfitsLimit: 12_570,
  class4UpperProfitsLimit: 50_270,
  class4MainRate: 0.06,
  class4AdditionalRate: 0.02,
  /** Class 2 NI — flat weekly rate, paid if profit >= smallProfitsThreshold */
  class2NiWeeklyRate: 3.45,
  class2NiSmallProfitsThreshold: 12_570,
  class2NiWeeksInYear: 52,
};

export interface TaxBandBreakdown {
  band: string;
  rate: number;
  amount: number;
}

export interface PaymentOnAccount {
  description: string;
  dueDate: string;
  amount: number;
}

export interface EstimatedTaxSummary {
  taxYearLabel: string;
  taxableProfitStartingPoint: number;
  /** Adjusted personal allowance after any taper (tapers for income > £100k) */
  effectivePersonalAllowance: number;
  personalAllowanceUsed: number;
  taxableIncomeAfterAllowance: number;
  estimatedIncomeTax: number;
  incomeTaxBreakdown: TaxBandBreakdown[];
  /** Class 2 NI (flat rate, if profit >= small profits threshold) */
  estimatedClass2Ni: number;
  /** Class 4 NI (profit-linked) */
  estimatedClass4Ni: number;
  estimatedNationalInsurance: number;
  niBreakdown: TaxBandBreakdown[];
  totalEstimatedTax: number;
  /** HMRC Payments on Account schedule (31 Jan / 31 Jul each year) */
  paymentsOnAccount: PaymentOnAccount[];
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
    /** Sum of all adjustments to be ADDED BACK to profit (disallowed + uncategorised expenses - uncategorised income) */
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
  mtdCompliance: {
    requiresQuarterlyReporting: boolean;
    grossTurnover: number;
    threshold: number;
    /** Amount to set aside each quarter (total tax / 4) — for cash-flow planning only */
    suggestedQuarterlySaving: number;
    hasReachedThreshold: boolean;
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

const MTD_ITSA_THRESHOLD = 50000;

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
  const c = UK_SOLE_TRADER_ESTIMATE_2026_27;
  const breakdown: TaxBandBreakdown[] = [];

  // Class 2 NI — flat weekly rate if profit >= small profits threshold
  let class2Ni = 0;
  if (taxableProfit >= c.class2NiSmallProfitsThreshold) {
    class2Ni = round2(c.class2NiWeeklyRate * c.class2NiWeeksInYear);
    breakdown.push({ band: "Class 2 NI (flat rate)", rate: c.class2NiWeeklyRate, amount: class2Ni });
  }

  // Class 4 NI — profit-linked
  let class4Ni = 0;
  if (taxableProfit > c.class4LowerProfitsLimit) {
    const mainBand = c.class4UpperProfitsLimit - c.class4LowerProfitsLimit;
    let remaining = taxableProfit - c.class4LowerProfitsLimit;

    const mainPortion = Math.min(remaining, mainBand);
    const mainNi = round2(mainPortion * c.class4MainRate);
    class4Ni += mainNi;
    breakdown.push({ band: "Class 4 Main Rate (6%)", rate: c.class4MainRate, amount: mainNi });
    remaining -= mainPortion;

    if (remaining > 0) {
      const additionalNi = round2(remaining * c.class4AdditionalRate);
      class4Ni += additionalNi;
      breakdown.push({ band: "Class 4 Additional Rate (2%)", rate: c.class4AdditionalRate, amount: additionalNi });
    }
    class4Ni = round2(class4Ni);
  }

  return { total: round2(class2Ni + class4Ni), class2Ni, class4Ni, breakdown };
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
    const catName = tx.category.trim();
    const existing = categoryMap.get(catName);
    if (existing) {
      existing.accountingAmount = round2(existing.accountingAmount + tx.netAmount);
      existing.claimableAmount = round2(existing.claimableAmount + tx.allowableAmount);
      existing.nonClaimableAmount = round2(existing.nonClaimableAmount + tx.disallowedAmount);
      existing.transactionCount += 1;
    } else {
      categoryMap.set(catName, {
        category: catName,
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
    const catName = tx.category.trim();
    const existing = adjustmentMap.get(catName);
    if (existing) {
      existing.disallowedAmount = round2(existing.disallowedAmount + tx.disallowedAmount);
      existing.transactionCount += 1;
    } else {
      adjustmentMap.set(catName, {
        category: catName,
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
    const c = UK_SOLE_TRADER_ESTIMATE_2026_27;

    // Personal allowance taper: reduced by £1 for every £2 of income above £100k
    // Fully tapered out at £125,140 (= 100,000 + 2 × 12,570)
    const effectivePersonalAllowance = taxableProfit > c.personalAllowanceTaperThreshold
      ? round2(Math.max(0, c.personalAllowance - Math.floor((taxableProfit - c.personalAllowanceTaperThreshold) / 2)))
      : c.personalAllowance;

    const personalAllowanceUsed = round2(Math.min(taxableProfit, effectivePersonalAllowance));
    const taxableIncomeAfterAllowance = round2(Math.max(taxableProfit - effectivePersonalAllowance, 0));

    const { total: estimatedIncomeTax, breakdown: incomeTaxBreakdown } =
      estimateSoleTraderIncomeTax(taxableIncomeAfterAllowance);
    const { total: estimatedNationalInsurance, class2Ni: estimatedClass2Ni, class4Ni: estimatedClass4Ni, breakdown: niBreakdown } =
      estimateSoleTraderNationalInsurance(taxableProfit);

    const totalEstimatedTax = round2(estimatedIncomeTax + estimatedNationalInsurance);

    // HMRC Payments on Account: two instalments of 50% each
    // 1st payment on account: 31 January of current tax year
    // 2nd payment on account: 31 July following the tax year
    // Balancing payment: 31 January following the tax year
    // We approximate using the current total — real POA would use prior year's bill
    const halfBill = round2(totalEstimatedTax / 2);
    const paymentsOnAccount: PaymentOnAccount[] = totalEstimatedTax > 0 ? [
      {
        description: "1st Payment on Account (50% of estimated tax)",
        dueDate: "31 January 2027",
        amount: halfBill,
      },
      {
        description: "2nd Payment on Account (50% of estimated tax)",
        dueDate: "31 July 2027",
        amount: halfBill,
      },
      {
        description: "Balancing Payment (if actual tax > payments made)",
        dueDate: "31 January 2028",
        amount: 0, // Only known after filing
      },
    ] : [];

    const taxAssumptions = [
      "Sole trader estimate using 2026/27 UK tax bands.",
      "Class 2 NI (£3.45/week) applied if profit ≥ £12,570.",
      "Class 4 NI: 6% on profits £12,571–£50,270; 2% above £50,270.",
    ];
    if (taxableProfit > c.personalAllowanceTaperThreshold) {
      taxAssumptions.push(
        `Personal allowance tapered to £${effectivePersonalAllowance.toLocaleString("en-GB")} (income exceeds £100,000).`,
      );
    }

    estimatedTax = {
      taxYearLabel: c.taxYearLabel,
      taxableProfitStartingPoint: taxableProfit,
      effectivePersonalAllowance,
      personalAllowanceUsed,
      taxableIncomeAfterAllowance,
      estimatedIncomeTax,
      incomeTaxBreakdown,
      estimatedClass2Ni,
      estimatedClass4Ni,
      estimatedNationalInsurance,
      niBreakdown,
      totalEstimatedTax,
      paymentsOnAccount,
      assumptions: taxAssumptions,
    };
  }

  const totalExpenses = round2(pnl.expenseSection.netTotal);

  // MTD ITSA Compliance Logic
  // Turnover is gross income before expenses/VAT.
  const grossTurnover = round2(
    allPnLTxs
      .filter(tx => tx.accountType === "income")
      .reduce((s, tx) => s + tx.grossAmount, 0)
  );
  const requiresQuarterlyReporting = businessType === "sole_trader" && grossTurnover >= MTD_ITSA_THRESHOLD;

  // Suggested quarterly saving for cash-flow planning (not an HMRC payment date)
  const suggestedQuarterlySaving = estimatedTax
    ? round2(estimatedTax.totalEstimatedTax / 4)
    : 0;

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
    mtdCompliance: {
      requiresQuarterlyReporting,
      grossTurnover,
      threshold: MTD_ITSA_THRESHOLD,
      suggestedQuarterlySaving,
      hasReachedThreshold: grossTurnover >= MTD_ITSA_THRESHOLD,
    },
    taxAdjustments,
    fullyClaimableCategories,
    partiallyClaimableCategories,
    nonClaimableCategories,
    estimatedTax,
    assumptions,
  };
}
