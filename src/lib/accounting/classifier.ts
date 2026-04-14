/**
 * Accounting classifier — derives the accounting treatment for a transaction
 * based on its resolved category and workspace VAT-registration status.
 *
 * Produces:
 *  - effectiveTaxTreatment  (TaxTreatment)
 *  - effectiveVatRate       (%)
 *  - taxAmount              (VAT / tax portion of the gross amount)
 *  - netAmount              (amount excluding VAT)
 *  - grossAmount            (original transaction amount)
 *  - vatRecoverable         (boolean — is input VAT reclaimable?)
 *  - accountType            (income / expense / asset / liability / equity)
 *  - statementType          (p_and_l / balance_sheet / equity_movement / tax_control)
 *  - reportingBucket        (sub-grouping label)
 */

import type {
  CategoryRule,
  TaxTreatment,
  AccountType,
  StatementType,
  TransactionRecord,
} from "@/lib/domain/types";

export interface ClassifiedTransaction {
  transactionId: string;
  merchant: string;
  description: string;
  date?: string;
  currency: string;
  employee?: string;
  reference?: string;

  // Category / accounting classification
  category: string;
  accountType: AccountType;
  statementType: StatementType;
  reportingBucket: string;
  glCode?: string;

  // Tax breakdown
  effectiveTaxTreatment: TaxTreatment;
  effectiveVatRate: number;
  vatRecoverable: boolean;
  grossAmount: number;    // original transaction amount (as imported)
  netAmount: number;      // gross minus VAT
  taxAmount: number;      // VAT / tax portion

  // Tax allowability (HMRC add-back logic)
  /** Whether this transaction type supports the concept of tax allowability (only true for P&L expenses) */
  supportsAllowability: boolean;
  allowableForTax: boolean;
  allowablePercentage: number;
  /** Portion of netAmount that reduces taxable profit (0 if non-allowable) */
  allowableAmount: number;
  /** Portion of netAmount added back in the tax calculation (0 if fully allowable) */
  disallowedAmount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Treatments where no VAT split is applied regardless of registration status.
 * The gross amount IS the net amount (there is no embedded VAT).
 */
const NO_SPLIT_TREATMENTS: TaxTreatment[] = [
  "exempt",
  "outside_scope",
  "no_vat",
  "non_recoverable",
];

const ZERO_RATED_TREATMENTS: TaxTreatment[] = ["zero_rated"];

/**
 * Given a gross amount and tax parameters, compute net/tax split.
 * Assumes amounts are VAT-inclusive (standard for consumer/card transactions).
 */
export function computeTaxAmounts(
  grossAmount: number,
  taxTreatment: TaxTreatment,
  vatRate: number,
  vatRegistered: boolean,
): { netAmount: number; taxAmount: number; vatRecoverable: boolean } {
  // Non-VAT-registered: everything treated as no-VAT, no split
  if (!vatRegistered || taxTreatment === "no_vat") {
    return { netAmount: grossAmount, taxAmount: 0, vatRecoverable: false };
  }

  // Exempt / outside scope / non-recoverable: gross IS the net (no VAT embedded)
  if (NO_SPLIT_TREATMENTS.includes(taxTreatment)) {
    return {
      netAmount: grossAmount,
      taxAmount: 0,
      vatRecoverable: false,
    };
  }

  // Zero rated: no tax, but it IS a VAT supply
  if (ZERO_RATED_TREATMENTS.includes(taxTreatment)) {
    return { netAmount: grossAmount, taxAmount: 0, vatRecoverable: true };
  }

  // Standard / reduced / reverse_charge: extract VAT from inclusive gross
  if (vatRate <= 0) {
    return { netAmount: grossAmount, taxAmount: 0, vatRecoverable: true };
  }

  const taxAmount = round2(grossAmount * vatRate / (100 + vatRate));
  const netAmount = round2(grossAmount - taxAmount);
  const vatRecoverable = taxTreatment !== "non_recoverable";

  return { netAmount, taxAmount, vatRecoverable };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ─── Main classifier ─────────────────────────────────────────────────────────

/**
 * Classify a single transaction given the resolved category rule and workspace settings.
 * If no category is resolved, defaults to expense / p_and_l.
 */
export function classifyTransaction(
  tx: TransactionRecord,
  resolvedCategory: CategoryRule | undefined,
  vatRegistered: boolean,
): ClassifiedTransaction {
  // Pull accounting metadata from the category (with safe defaults).
  // When uncategorised, infer income vs expense from the sign of the amount.
  const accountType: AccountType = resolvedCategory?.accountType ?? (tx.amount >= 0 ? "income" : "expense");
  const statementType: StatementType = resolvedCategory?.statementType ?? "p_and_l";
  const reportingBucket = resolvedCategory?.reportingBucket ?? "Uncategorised";
  const categoryName = resolvedCategory?.category ?? tx.category ?? "Uncategorised";
  const glCode = tx.glCode || resolvedCategory?.glCode;

  // Tax allowability — only meaningful for P&L expenses.
  const isExpenseOnPnL = accountType === "expense" && statementType === "p_and_l";
  
  // Defaults to true (allowable) so uncategorised transactions are not incorrectly penalised.
  let allowableForTax = resolvedCategory?.allowableForTax ?? true;
  let allowablePercentage = resolvedCategory?.allowablePercentage ?? 100;

  // For non-expenses, we ignore any non-allowable status and treat as fully allowable (in its own bucket)
  if (!isExpenseOnPnL) {
    allowableForTax = true;
    allowablePercentage = 100;
  }

  // Tax treatment: transaction-level override takes priority, then category default
  const taxTreatment: TaxTreatment =
    tx.taxTreatment ??
    resolvedCategory?.defaultTaxTreatment ??
    "no_vat";

  const vatRate: number =
    tx.taxRate ??
    resolvedCategory?.defaultVatRate ??
    0;

  const { netAmount, taxAmount, vatRecoverable } = computeTaxAmounts(
    Math.abs(tx.amount),
    taxTreatment,
    vatRate,
    vatRegistered,
  );

  // Allowable/disallowed amounts — only relevant for P&L expenses.
  const allowableAmount = isExpenseOnPnL
    ? (allowableForTax ? round2(netAmount * allowablePercentage / 100) : 0)
    : 0;
  const disallowedAmount = isExpenseOnPnL ? round2(netAmount - allowableAmount) : 0;

  return {
    transactionId: tx.id,
    merchant: tx.merchant,
    description: tx.description,
    date: tx.transactionDate,
    currency: tx.currency,
    employee: tx.employee,
    reference: tx.reference,
    category: categoryName,
    accountType,
    statementType,
    reportingBucket,
    glCode,
    effectiveTaxTreatment: taxTreatment,
    effectiveVatRate: vatRate,
    vatRecoverable,
    grossAmount: round2(Math.abs(tx.amount)),
    netAmount,
    taxAmount,
    supportsAllowability: isExpenseOnPnL,
    allowableForTax,
    allowablePercentage,
    allowableAmount,
    disallowedAmount,
  };
}

// ─── Convenience: classify a batch ───────────────────────────────────────────

export function classifyTransactions(
  transactions: TransactionRecord[],
  categoryRules: CategoryRule[],
  vatRegistered: boolean,
): ClassifiedTransaction[] {
  const ruleMap = buildCategoryRuleMap(categoryRules);
  return transactions.map((tx) => {
    const cat = tx.category ?? "";
    const rule = ruleMap.get(cat);
    return classifyTransaction(tx, rule, vatRegistered);
  });
}

/**
 * Build a lookup map: category name → CategoryRule.
 * This is used to go from a transaction's `category` string to the full rule object.
 */
export function buildCategoryRuleMap(categoryRules: CategoryRule[]): Map<string, CategoryRule> {
  const map = new Map<string, CategoryRule>();
  for (const rule of categoryRules) {
    map.set(rule.category, rule);
  }
  return map;
}

// ─── Label helpers ────────────────────────────────────────────────────────────

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  income: "Income",
  expense: "Expense",
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
};

export const STATEMENT_TYPE_LABELS: Record<StatementType, string> = {
  p_and_l: "Profit & Loss",
  balance_sheet: "Balance Sheet",
  equity_movement: "Equity",
  tax_control: "Tax Control",
};

export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  standard_rated: "Standard rated",
  reduced_rated: "Reduced rated",
  zero_rated: "Zero rated",
  exempt: "Exempt",
  outside_scope: "Outside scope",
  no_vat: "No VAT",
  reverse_charge: "Reverse charge",
  non_recoverable: "Non-recoverable",
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  income: "bg-emerald-50 text-emerald-700",
  expense: "bg-orange-50 text-orange-700",
  asset: "bg-blue-50 text-blue-700",
  liability: "bg-red-50 text-red-700",
  equity: "bg-purple-50 text-purple-700",
};

export const STATEMENT_TYPE_COLORS: Record<StatementType, string> = {
  p_and_l: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
  balance_sheet: "bg-blue-50 text-blue-700",
  equity_movement: "bg-purple-50 text-purple-700",
  tax_control: "bg-amber-50 text-amber-700",
};
