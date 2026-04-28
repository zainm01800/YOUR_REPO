import "server-only";

import type { User } from "@/lib/domain/types";
import { isWebsiteOwnerEmail } from "@/lib/auth/viewer-access";

export async function resolveViewerUser<T extends Pick<User, "id" | "email" | "name" | "accountType">>(
  user: T,
): Promise<T> {
  if (isWebsiteOwnerEmail(user.email)) {
    return {
      ...user,
      accountType: "accountant",
    };
  }

  return user;
}
