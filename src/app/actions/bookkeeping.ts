"use server";

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
