import type {
  GlCodeRule,
  ReconciliationRun,
  TransactionRecord,
} from "@/lib/domain/types";

function matchesPattern(value: string, pattern?: string) {
  if (!pattern) {
    return false;
  }

  return new RegExp(pattern, "i").test(value);
}

export function suggestGlCode(
  transaction: TransactionRecord,
  glRules: GlCodeRule[],
  run?: ReconciliationRun,
) {
  const haystack = `${transaction.merchant} ${transaction.description}`;
  const directRule = [...glRules]
    .sort((a, b) => a.priority - b.priority)
    .find(
      (rule) =>
        matchesPattern(transaction.merchant, rule.supplierPattern) ||
        matchesPattern(haystack, rule.keywordPattern),
    );

  if (directRule) {
    return directRule.glCode;
  }

  const historical = run?.transactions.find(
    (candidate) =>
      candidate.id !== transaction.id &&
      candidate.glCode &&
      candidate.merchant.toLowerCase() === transaction.merchant.toLowerCase(),
  );

  return historical?.glCode;
}

