"use server";

import { randomUUID } from "crypto";
import { getRepository } from "@/lib/data";
import { revalidatePath } from "next/cache";

/**
 * Verifies the current user is authenticated.
 * Throws if there is no authenticated session.
 */
async function requireAuthenticatedUser() {
  const repository = await getRepository();
  const user = await repository.getCurrentUser();
  if (!user?.id) {
    throw new Error("Unauthenticated: you must be signed in to perform this action.");
  }
  return user;
}

/**
 * Updates a transaction's category directly.
 */
export async function updateTransactionCategoryAction(
  transactionId: string, 
  category: string | null,
  reason?: string,
  confidenceScore?: number
) {
  try {
    await requireAuthenticatedUser();
    const repository = await getRepository();
    await repository.setTransactionCategory(transactionId, category, reason, confidenceScore);
  } catch (err: any) {
    console.error(`[actions/bookkeeping] updateTransactionCategoryAction failed for ID ${transactionId} (category: ${category}):`, err);
    return { error: err.message || "Could not save category" };
  }

  revalidatePath("/bookkeeping/transactions");
  revalidatePath("/bookkeeping/tax-summary");
  
  return { success: true };
}

/**
 * Updates multiple transactions' category directly.
 */
export async function bulkUpdateTransactionCategoryAction(
  transactionIds: string[], 
  category: string | null,
  reason?: string,
  confidenceScore?: number
) {
  try {
    await requireAuthenticatedUser();
    const repository = await getRepository();
    await Promise.all(
      transactionIds.map(id => repository.setTransactionCategory(id, category, reason, confidenceScore))
    );
  } catch (err: any) {
    console.error(`[actions/bookkeeping] bulkUpdateTransactionCategoryAction failed for ${transactionIds.length} IDs (category: ${category}):`, err);
    return { error: err.message || "Could not apply bulk category" };
  }

  revalidatePath("/bookkeeping/transactions");
  revalidatePath("/bookkeeping/tax-summary");
  
  return { success: true };
}

/**
 * Updates multiple transactions' tax altowable status.
 */
export async function bulkUpdateTransactionAllowableAction(transactionIds: string[], allowableForTax: boolean) {
  await requireAuthenticatedUser();
  const repository = await getRepository();
  await Promise.all(
    transactionIds.map(id => repository.setTransactionAllowable(id, allowableForTax))
  );

  revalidatePath("/bookkeeping/transactions");
  revalidatePath("/bookkeeping/tax-summary");
}

/**
 * Toggles whether an individual expense explicitly overrides its claimable status.
 * Used on the Expenses tab to manually mark items as claimable or non-claimable.
 */
export async function toggleExpenseClaimabilityAction(
  rawId: string, 
  source: "manual" | "transaction", 
  claimable: boolean
) {
  try {
    await requireAuthenticatedUser();
    const repository = await getRepository();
    // For imported bank transactions, the ID is prefixed with tx: to prevent collision in the unified table
    const id = rawId.startsWith("tx:") ? rawId.slice(3) : rawId;

    if (source === "transaction") {
      await repository.setTransactionAllowable(id, claimable);
    } else {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      await prisma.manualExpense.update({
        where: { id },
        data: { isClaimableOverride: claimable },
        select: { id: true },
      });
    }
  } catch (err: any) {
    console.error(`[actions/bookkeeping] toggleExpenseClaimabilityAction failed for ID ${rawId}:`, err);
    return { error: err.message || "Could not toggle claimability" };
  }

  revalidatePath("/expenses");
  revalidatePath("/bookkeeping/tax-summary");
  
  return { success: true };
}

/**
 * Toggles whether a particular category is tax-allowable.
 */
export async function updateCategoryAllowabilityAction(category: string, allowableForTax: boolean) {
  await requireAuthenticatedUser();
  const repository = await getRepository();
  const rules = await repository.getCategoryRules();
  
  let updated = false;
  const updatedRules = rules.map((rule) => {
    if (rule.category === category) {
      updated = true;
      return { ...rule, allowableForTax };
    }
    return rule;
  });

  if (!updated) {
    throw new Error(`Category "${category}" not found in rules.`);
  }

  await repository.replaceAllCategoryRules({ rules: updatedRules });
  
  revalidatePath("/bookkeeping/transactions");
  revalidatePath("/bookkeeping/tax-summary");
  revalidatePath("/settings");
}

/**
 * Deletes multiple transactions.
 */
export async function deleteTransactionsAction(ids: string[]) {
  await requireAuthenticatedUser();
  const repository = await getRepository();
  await repository.deleteTransactions(ids);

  revalidatePath("/bookkeeping/transactions");
  revalidatePath("/bookkeeping/tax-summary");
}

// ─── Noise words that carry no identifying signal in merchant/description strings ───
const NOISE_TOKENS_SERVER = new Set([
  "bacs", "chaps", "faster", "payment", "payments", "transfer", "direct",
  "debit", "credit", "standing", "order", "refund", "receipt", "salary",
  "from", "via", "for", "ref", "reference", "invoice", "number", "date",
  "ltd", "limited", "plc", "inc", "llp", "llc", "corp", "group", "services",
  "uk", "gb", "eur", "europe", "the", "and",
]);

/**
 * Extracts meaningful identifier tokens (4+ chars, non-numeric, non-noise)
 * from a merchant/description string. Used to build supplier patterns.
 */
function extractTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (t) =>
        t.length >= 4 &&
        !/^\d+$/.test(t) &&
        !NOISE_TOKENS_SERVER.has(t),
    );
}

/**
 * Builds a regex supplierPattern from a set of identifier tokens.
 * Uses lookaheads so ALL tokens must be present (in any order):
 *   ["john", "smith"]  →  "(?=.*john)(?=.*smith)"
 *   ["amazon"]         →  "amazon"
 *
 * This means "JOHN SMITH REF001" and "BACS JOHN SMITH" both match,
 * but "JOHN DOE" (no "smith") does not.
 */
function buildSupplierPattern(tokens: string[]): string {
  if (tokens.length === 0) return "";
  if (tokens.length === 1) return tokens[0];
  return tokens.map((t) => `(?=.*${t})`).join("");
}

/**
 * Creates a learned merchant→category rule so that future imports automatically
 * categorise transactions from this merchant.
 *
 * The rule is stored as a CategoryRule with a token-based supplierPattern at
 * priority 5 so it fires before keyword/system rules.
 */
export async function createMerchantRuleAction(
  merchantName: string,
  category: string,
  description = "",
) {
  if (!merchantName.trim() || !category.trim()) return;
  await requireAuthenticatedUser();

  const repository = await getRepository();
  const rules = await repository.getCategoryRules();

  // Find the base category rule to inherit accounting metadata
  const baseRule = rules.find((r) => r.category === category);
  if (!baseRule) throw new Error(`Category "${category}" not found`);

  let tokens = extractTokens(`${merchantName} ${description}`);
  // If merchant alone gives nothing useful, try description tokens as keywordPattern
  const useKeyword = tokens.length === 0 || extractTokens(merchantName).length === 0;
  if (tokens.length === 0) {
    tokens = extractTokens(description);
  }
  if (tokens.length === 0) return; // nothing meaningful to learn

  const pattern = buildSupplierPattern(tokens);

  // Don't create a duplicate pattern for the same category
  const alreadyExists = rules.some((r) => {
    if (!r.supplierPattern && !r.keywordPattern) return false;
    try {
      return (
        (r.supplierPattern === pattern || r.keywordPattern === pattern) ||
        (r.category === category &&
          (r.supplierPattern
            ? new RegExp(r.supplierPattern, "i").test(merchantName)
            : r.keywordPattern
              ? new RegExp(r.keywordPattern, "i").test(`${merchantName} ${description}`)
              : false))
      );
    } catch {
      return false;
    }
  });
  if (alreadyExists) return;

  const slug = `learned-${tokens.slice(0, 3).join("-").slice(0, 40)}-${Date.now()}`;

  const newRule = {
    ...baseRule,
    id: randomUUID(),
    slug,
    supplierPattern: useKeyword ? undefined : pattern,
    keywordPattern: useKeyword ? pattern : undefined,
    priority: 5,
    isSystemDefault: false,
    isActive: true,
    isVisible: true,
    description: `Auto-learned: ${tokens.slice(0, 3).join(" ")}`,
    sortOrder: baseRule.sortOrder - 1,
  };

  await repository.replaceAllCategoryRules({ rules: [...rules, newRule] });

  revalidatePath("/bookkeeping/transactions");
  revalidatePath("/settings");
}

/**
 * Batch-saves AI categorisation results as learned rules.
 * Called automatically after every successful AI run so future imports
 * don't need to hit the AI API for already-known merchants.
 *
 * Rules are created at priority 20 (lower urgency than manual-learned=5,
 * higher than system keyword rules=100). Duplicates and low-confidence
 * results (null category) are silently skipped.
 */
export async function saveAiLearnedRulesAction(
  results: { merchant: string; description: string; category: string }[],
) {
  if (results.length === 0) return;
  await requireAuthenticatedUser();

  const repository = await getRepository();
  const rules = await repository.getCategoryRules();

  const newRules = [...rules];
  let added = 0;

  for (const result of results) {
    if (!result.category || !result.merchant) continue;

    const baseRule = rules.find((r) => r.category === result.category);
    if (!baseRule) continue;

    let tokens = extractTokens(`${result.merchant} ${result.description ?? ""}`);
    // If merchant alone gives nothing useful, try description tokens as keywordPattern
    const useKeyword = tokens.length === 0 || extractTokens(result.merchant).length === 0;
    if (tokens.length === 0) {
      tokens = extractTokens(result.description ?? "");
    }
    if (tokens.length === 0) continue;

    const pattern = buildSupplierPattern(tokens);

    // Skip if a pattern already covers this merchant+category combination
    const alreadyCovered = [...rules, ...newRules.slice(rules.length)].some((r) => {
      if (!r.supplierPattern && !r.keywordPattern) return false;
      try {
        return r.supplierPattern
          ? new RegExp(r.supplierPattern, "i").test(result.merchant)
          : r.keywordPattern
            ? new RegExp(r.keywordPattern, "i").test(`${result.merchant} ${result.description ?? ""}`)
            : false;
      } catch {
        return false;
      }
    });
    if (alreadyCovered) continue;

    const slug = `ai-${tokens.slice(0, 3).join("-").slice(0, 40)}-${Date.now()}-${added}`;

    newRules.push({
      ...baseRule,
      id: randomUUID(),
      slug,
      supplierPattern: useKeyword ? undefined : pattern,
      keywordPattern: useKeyword ? pattern : undefined,
      priority: 20, // AI-learned: lower urgency than manual rules
      isSystemDefault: false,
      isActive: true,
      isVisible: true,
      description: `AI-learned: ${tokens.slice(0, 3).join(" ")}`,
      sortOrder: baseRule.sortOrder,
    });

    added++;
  }

  if (added === 0) return;

  await repository.replaceAllCategoryRules({ rules: newRules });

  revalidatePath("/bookkeeping/transactions");
  revalidatePath("/settings");
}
