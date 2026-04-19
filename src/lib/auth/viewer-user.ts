import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import type { User } from "@/lib/domain/types";
import { getClerkPrimaryEmail, getLockedAccountTypeFromClerkUser } from "@/lib/auth/account-type";
import { isWebsiteOwnerEmail } from "@/lib/auth/viewer-access";

export async function resolveViewerUser<T extends Pick<User, "id" | "email" | "name" | "accountType">>(
  user: T,
): Promise<T> {
  const clerkUser = await currentUser();
  const clerkEmail = getClerkPrimaryEmail(clerkUser);
  const effectiveEmail = clerkEmail ?? user.email;

  if (isWebsiteOwnerEmail(effectiveEmail)) {
    return {
      ...user,
      email: effectiveEmail,
      accountType: "accountant",
    };
  }

  const lockedAccountType = getLockedAccountTypeFromClerkUser(clerkUser);
  if (!lockedAccountType) {
    return {
      ...user,
      email: effectiveEmail,
    };
  }

  return {
    ...user,
    email: effectiveEmail,
    accountType: lockedAccountType,
  };
}
