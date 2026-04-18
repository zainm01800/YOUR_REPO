"use server";

import { randomUUID } from "crypto";
import { getRepository } from "@/lib/data";
import { revalidatePath } from "next/cache";

/**
 * Updates a transaction's category directly.
 */
export async function updateTransactionCategoryAction(transactionId: string, category: string | null) {
  const repository = await getRepository();
  await repository.setTransactionCategory(transactionId, category);
  
  revalidatePath("/bookkeeping/transactions");
  revalidatePath("/bookkeeping/tax-summary");
}

/**
 * Updates multiple transactions' category directly.
 */
export async function bulkUpdateTransactionCategoryAction(transactionIds: string[], category: string | null) {
  const repository = await getRepository();
  await Promise.all(
    transactionIds.map(id => repository.setTransactionCategory(id, category))
  );
  
  revalidatePath("/bookkeeping/transactions");
  revalidatePath("/bookkeeping/tax-summary");
}

/**
 * Toggles whether a particular category is tax-allowable.
 */
export async function updateCategoryAllowabilityAction(category: string, allowableForTax: boolean) {
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
  const repository = await getRepository();
  await repository.deleteTransactions(ids);

  revalidatePath("/bookkeeping/transactions");
  revalidatePath("/bookkeeping/tax-summary");
}

/**
 * Creates a learned merchant→category rule so that future imports automatically
 * categorise transactions from this merchant.
 *
 * The rule is stored as a CategoryRule with supplierPattern = escaped merchant
 * name and high priority (5) so it fires before keyword rules.
 */
export async function createMerchantRuleAction(merchantName: string, category: string) {
  if (!merchantName.trim() || !category.trim()) return;

  const repository = await getRepository();
  const rules = await repository.getCategoryRules();

  // Find the base category rule to inherit accounting metadata
  const baseRule = rules.find((r) => r.category === category);
  if (!baseRule) throw new Error(`Category "${category}" not found`);

  // Escape the merchant name so it works as a regex supplierPattern
  const escaped = merchantName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Don't create a duplicate
  const alreadyExists = rules.some(
    (r) =>
      r.supplierPattern === escaped ||
      r.supplierPattern === `^${escaped}` ||
      // Exact case-insensitive match against existing patterns
      (r.supplierPattern &&
        new RegExp(r.supplierPattern, "i").test(merchantName) &&
        r.category === category),
  );
  if (alreadyExists) return;

  const slug = `learned-${merchantName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40)}-${Date.now()}`;

  const newRule = {
    ...baseRule,
    id: randomUUID(),
    slug,
    supplierPattern: escaped,
    keywordPattern: undefined,
    priority: 5, // high priority — fires before keyword rules
    isSystemDefault: false,
    isActive: true,
    isVisible: true,
    description: `Auto-learned: ${merchantName}`,
    sortOrder: baseRule.sortOrder - 1,
  };

  await repository.replaceAllCategoryRules({ rules: [...rules, newRule] });

  revalidatePath("/bookkeeping/transactions");
  revalidatePath("/settings");
}
