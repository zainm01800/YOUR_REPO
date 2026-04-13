import type { CategoryRule, TransactionRecord } from "@/lib/domain/types";

function matchesPattern(value: string, pattern?: string) {
  if (!pattern) return false;
  try {
    return new RegExp(pattern, "i").test(value);
  } catch {
    return false;
  }
}

/**
 * Returns the category for a transaction, in priority order:
 * 1. The transaction's own `category` field (manually set or from import)
 * 2. The first matching CategoryRule (sorted by priority asc)
 */
export function resolveCategory(
  transaction: TransactionRecord,
  categoryRules: CategoryRule[],
): string | undefined {
  if (transaction.category) return transaction.category;

  const haystack = `${transaction.merchant} ${transaction.description}`;
  const match = [...categoryRules]
    .filter((rule) => rule.isActive)
    .sort((a, b) => a.priority - b.priority)
    .find(
      (rule) =>
        matchesPattern(transaction.merchant, rule.supplierPattern) ||
        matchesPattern(haystack, rule.keywordPattern),
    );

  return match?.category;
}
