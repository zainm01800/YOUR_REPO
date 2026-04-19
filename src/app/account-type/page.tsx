import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountTypeSelectionCard } from "@/components/auth/account-type-selection-card";
import {
  getClerkPrimaryEmail,
  getLockedAccountTypeFromClerkUser,
} from "@/lib/auth/account-type";
import { PENDING_ACCOUNT_TYPE_COOKIE, normalizePendingAccountType } from "@/lib/auth/account-intent";
import { isWebsiteOwnerEmail } from "@/lib/auth/viewer-access";

export default async function AccountTypePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect("/sign-in");
  }

  const email = getClerkPrimaryEmail(clerkUser);
  if (!email) {
    redirect("/sign-in");
  }

  if (isWebsiteOwnerEmail(email)) {
    redirect("/dashboard");
  }

  const lockedAccountType = getLockedAccountTypeFromClerkUser(clerkUser);
  if (lockedAccountType) {
    redirect("/dashboard");
  }

  const cookieStore = await cookies();
  const defaultAccountType = normalizePendingAccountType(
    cookieStore.get(PENDING_ACCOUNT_TYPE_COOKIE)?.value,
  );

  return (
    <main className="min-h-screen bg-[var(--color-page)]">
      <AccountTypeSelectionCard defaultAccountType={defaultAccountType} email={email} />
    </main>
  );
}
