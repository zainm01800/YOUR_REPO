import type { BusinessType, UserAccountType } from "@/lib/domain/types";

export const PENDING_ACCOUNT_TYPE_COOKIE = "pending_account_type";
export const PENDING_BUSINESS_TYPE_COOKIE = "pending_business_type";

export function normalizePendingAccountType(value?: string | null): UserAccountType {
  return value === "accountant" ? "accountant" : "business_user";
}

export function normalizePendingBusinessType(value?: string | null): BusinessType {
  return value === "general_small_business" ? "general_small_business" : "sole_trader";
}
