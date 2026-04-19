import type { User as ClerkUser } from "@clerk/backend";
import type { UserAccountType } from "@/lib/domain/types";

export const ACCOUNT_TYPE_SETUP_PATH = "/account-type";

export function normalizeAccountTypeChoice(value: unknown): UserAccountType | null {
  if (value === "accountant") {
    return "accountant";
  }

  if (value === "business_user") {
    return "business_user";
  }

  return null;
}

export function getLockedAccountTypeFromClerkUser(
  clerkUser?: Pick<ClerkUser, "publicMetadata"> | null,
): UserAccountType | null {
  return normalizeAccountTypeChoice(clerkUser?.publicMetadata?.accountType);
}

export function getClerkPrimaryEmail(
  clerkUser?: Pick<ClerkUser, "emailAddresses"> | null,
): string | null {
  return clerkUser?.emailAddresses[0]?.emailAddress?.trim().toLowerCase() ?? null;
}
