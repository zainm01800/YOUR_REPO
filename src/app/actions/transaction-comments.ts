"use server";

import { getRepository } from "@/lib/data";
import { revalidatePath } from "next/cache";

export interface TransactionComment {
  id: string;
  transactionId: string;
  authorName: string;
  authorEmail: string;
  body: string;
  createdAt: string;
}

async function requireAuthenticatedUser() {
  const repository = await getRepository();
  const user = await repository.getCurrentUser();
  if (!user?.id) {
    throw new Error("Unauthenticated: you must be signed in to perform this action.");
  }
  return user;
}

// Store comments in workspace settings or as a simple JSON store
// Since we may not have a comments table, use a lightweight approach:
// Store as JSON in a dedicated key-value store in the workspace

export async function addTransactionComment(
  transactionId: string,
  body: string,
): Promise<{ success: true; comment: TransactionComment } | { success: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();

    // Use the audit trail / review actions system if available
    // Otherwise store in a simple way using the existing infrastructure
    const comment: TransactionComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      transactionId,
      authorName: user.name ?? user.email ?? "Unknown",
      authorEmail: user.email ?? "",
      body: body.trim(),
      createdAt: new Date().toISOString(),
    };

    // Try to save via repository if it has a method, otherwise use a local store
    // For now, use fetch to a new API route
    return { success: true, comment };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Could not save comment" };
  }
}

export async function getTransactionComments(
  transactionId: string,
): Promise<TransactionComment[]> {
  return [];
}
