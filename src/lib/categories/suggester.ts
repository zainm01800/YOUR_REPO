import type { CategoryRule, TransactionRecord } from "@/lib/domain/types";

function matchesPattern(value: string, pattern?: string) {
  if (!pattern) return false;
  try {
    return new RegExp(pattern, "i").test(value);
  } catch {
    return false;
  }
}

export type CategoryConfidence = "manual" | "learned" | "ai" | "auto";

/**
 * Returns the category for a transaction, in priority order:
 * 1. The transaction's own `category` field (manually set or from import)
 * 2. The first matching CategoryRule (sorted by priority asc)
 */
export function resolveCategory(
  transaction: TransactionRecord,
  categoryRules: CategoryRule[],
): string | undefined {
  return resolveCategoryWithConfidence(transaction, categoryRules).category;
}

/**
 * Like resolveCategory but also returns how the category was determined:
 * - "manual"  — the transaction had an explicit category saved on it
 * - "learned" — matched a manually-learned merchant rule (priority ≤ 5)
 * - "ai"      — matched an AI-learned rule (priority 6–20)
 * - "auto"    — matched a system keyword/supplier rule (priority > 20)
 */
export function resolveCategoryWithConfidence(
  transaction: TransactionRecord,
  categoryRules: CategoryRule[],
): { category: string | undefined; confidence: CategoryConfidence | undefined } {
  if (transaction.category) {
    return { category: transaction.category, confidence: "manual" };
  }

  const haystack = `${transaction.merchant} ${transaction.description}`;
  const match = [...categoryRules]
    .filter((rule) => rule.isActive)
    .sort((a, b) => a.priority - b.priority)
    .find(
      (rule) =>
        matchesPattern(transaction.merchant, rule.supplierPattern) ||
        matchesPattern(haystack, rule.keywordPattern),
    );

  if (!match) return { category: undefined, confidence: undefined };

  let confidence: CategoryConfidence;
  if (match.priority <= 5) confidence = "learned";
  else if (match.priority <= 20) confidence = "ai";
  else confidence = "auto";

  return { category: match.category, confidence };
}
