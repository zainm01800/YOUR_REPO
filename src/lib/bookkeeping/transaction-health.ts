import type { CategoryRule, TransactionRecord } from "@/lib/domain/types";
import { resolveCategoryWithConfidence } from "@/lib/categories/suggester";

export type TransactionHealthStatus = "ready" | "needs_review" | "excluded";
export type TransactionHealthTone = "success" | "warning" | "danger" | "muted";

export type TransactionIssueCode =
  | "needs_category"
  | "missing_receipt"
  | "vat_review"
  | "non_claimable"
  | "vat_on_non_claimable"
  | "non_p_and_l"
  | "excluded"
  | "duplicate_possible"
  | "possible_personal"
  | "unusual_spend";

export interface TransactionIssue {
  code: TransactionIssueCode;
  label: string;
  detail: string;
  tone: TransactionHealthTone;
}

export interface TransactionHealth {
  status: TransactionHealthStatus;
  label: string;
  detail: string;
  tone: TransactionHealthTone;
  resolvedCategory: string;
  categoryRule?: CategoryRule;
  issues: TransactionIssue[];
  isExpense: boolean;
  isIncome: boolean;
  isClaimableExpense: boolean;
}

const REVIEW_CATEGORY_NAMES = new Set([
  "uncategorised",
  "uncategorized",
  "needs review",
  "suspense",
]);

const PERSONAL_HINTS = [
  "netflix",
  "spotify",
  "gym",
  "cinema",
  "takeaway",
  "deliveroo",
  "just eat",
  "uber eats",
  "personal",
];

function normalise(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function findCategoryRule(category: string, categoryRules: CategoryRule[]) {
  const wanted = normalise(category);
  return categoryRules.find((rule) => normalise(rule.category) === wanted);
}

export function getTransactionHealth(
  transaction: TransactionRecord,
  categoryRules: CategoryRule[],
  options: {
    vatRegistered?: boolean;
    duplicateCount?: number;
    receiptThreshold?: number;
  } = {},
): TransactionHealth {
  const isIncome = transaction.amount >= 0;
  const isExpense = transaction.amount < 0;
  const receiptThreshold = options.receiptThreshold ?? 25;
  const resolved = resolveCategoryWithConfidence(transaction, categoryRules).category ?? "";
  const categoryRule = resolved ? findCategoryRule(resolved, categoryRules) : undefined;
  const categoryName = normalise(resolved);
  const issues: TransactionIssue[] = [];

  if (transaction.excludedFromExport) {
    issues.push({
      code: "excluded",
      label: "Excluded",
      detail: "This transaction is excluded from exports and tax summaries.",
      tone: "muted",
    });
  }

  if (!resolved || REVIEW_CATEGORY_NAMES.has(categoryName)) {
    issues.push({
      code: "needs_category",
      label: "Needs category",
      detail: "Choose a bookkeeping category before relying on reports or tax estimates.",
      tone: "warning",
    });
  }

  const likelyNeedsReceipt =
    isExpense &&
    Math.abs(transaction.amount) >= receiptThreshold &&
    !transaction.noReceiptRequired &&
    !transaction.runId;

  if (likelyNeedsReceipt) {
    issues.push({
      code: "missing_receipt",
      label: "Receipt missing",
      detail: "Attach a receipt or mark it as no receipt required for a cleaner accountant pack.",
      tone: "warning",
    });
  }

  if (options.vatRegistered && categoryRule?.accountType === "expense") {
    const taxable =
      transaction.taxTreatment === "standard_rated" ||
      transaction.taxTreatment === "reduced_rated" ||
      categoryRule.defaultTaxTreatment === "standard_rated" ||
      categoryRule.defaultTaxTreatment === "reduced_rated";

    if (taxable && !transaction.vatCode) {
      issues.push({
        code: "vat_review",
        label: "VAT check",
        detail: "This looks VAT-relevant but has no VAT code yet.",
        tone: "warning",
      });
    }
  }

  if (categoryRule && categoryRule.accountType === "expense" && !categoryRule.allowableForTax) {
    issues.push({
      code: "non_claimable",
      label: "Not claimable",
      detail: "Included in bookkeeping, but added back for tax estimates.",
      tone: "muted",
    });
  }

  if (
    options.vatRegistered &&
    categoryRule?.accountType === "expense" &&
    !categoryRule.allowableForTax &&
    (transaction.vatCode || transaction.taxTreatment === "standard_rated" || transaction.taxTreatment === "reduced_rated")
  ) {
    issues.push({
      code: "vat_on_non_claimable",
      label: "VAT risk",
      detail: "VAT appears to be claimed on an expense category that is not normally tax-claimable.",
      tone: "danger",
    });
  }

  if (categoryRule && categoryRule.statementType !== "p_and_l") {
    issues.push({
      code: "non_p_and_l",
      label: "Non-P&L",
      detail: "This goes to balance sheet, equity, or tax control instead of profit and loss.",
      tone: "muted",
    });
  }

  if ((options.duplicateCount ?? 0) > 1) {
    issues.push({
      code: "duplicate_possible",
      label: "Possible duplicate",
      detail: "Another transaction has the same date, amount, and merchant text.",
      tone: "danger",
    });
  }

  const merchantText = normalise(`${transaction.merchant} ${transaction.description}`);
  if (isExpense && PERSONAL_HINTS.some((hint) => merchantText.includes(hint))) {
    issues.push({
      code: "possible_personal",
      label: "Possibly personal",
      detail: "This merchant looks like it may be personal or partly private. Confirm before claiming it.",
      tone: "warning",
    });
  }

  if (isExpense && Math.abs(transaction.amount) >= 1000 && !transaction.noReceiptRequired) {
    issues.push({
      code: "unusual_spend",
      label: "Large spend",
      detail: "Large expense. Check the category, receipt, and whether it should be an asset instead.",
      tone: "warning",
    });
  }

  const blockingIssues = issues.filter((issue) =>
    [
      "needs_category",
      "missing_receipt",
      "vat_review",
      "vat_on_non_claimable",
      "duplicate_possible",
      "possible_personal",
      "unusual_spend",
    ].includes(issue.code),
  );

  const status: TransactionHealthStatus = transaction.excludedFromExport
    ? "excluded"
    : blockingIssues.length > 0
      ? "needs_review"
      : "ready";

  const label =
    status === "excluded"
      ? "Excluded"
      : blockingIssues.length > 0
        ? blockingIssues[0].label
        : "Ready";

  const detail =
    status === "excluded"
      ? "Not included in export packs."
      : blockingIssues.length > 0
        ? blockingIssues[0].detail
        : "Category and tax treatment look usable.";

  const tone: TransactionHealthTone =
    status === "ready"
      ? "success"
      : status === "excluded"
        ? "muted"
        : blockingIssues.some((issue) => issue.tone === "danger")
          ? "danger"
          : "warning";

  return {
    status,
    label,
    detail,
    tone,
    resolvedCategory: resolved,
    categoryRule,
    issues,
    isExpense,
    isIncome,
    isClaimableExpense:
      isExpense &&
      categoryRule?.accountType === "expense" &&
      categoryRule.allowableForTax &&
      categoryRule.allowablePercentage > 0,
  };
}

export function getDuplicateKey(transaction: TransactionRecord) {
  const date = transaction.transactionDate ?? transaction.postedDate ?? "no-date";
  const amount = transaction.amount.toFixed(2);
  const merchant = normalise(transaction.merchant || transaction.description).replace(/\s+/g, " ");
  return `${date}|${amount}|${merchant}`;
}

export function buildDuplicateCounts(transactions: TransactionRecord[]) {
  const counts = new Map<string, number>();
  for (const transaction of transactions) {
    const key = getDuplicateKey(transaction);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
