"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPrismaClient } from "@/lib/data/prisma";
import {
  ACCOUNT_TYPE_SETUP_PATH,
  getClerkPrimaryEmail,
  getLockedAccountTypeFromClerkUser,
  normalizeAccountTypeChoice,
} from "@/lib/auth/account-type";
import { isWebsiteOwnerEmail } from "@/lib/auth/viewer-access";
import { PENDING_ACCOUNT_TYPE_COOKIE } from "@/lib/auth/account-intent";
import { upsertUserCompat } from "@/lib/data/user-compat";

type State = { error?: string } | null;

export async function lockAccountTypeChoice(_prevState: State, formData: FormData): Promise<State> {
  const selectedAccountType = normalizeAccountTypeChoice(formData.get("accountType"));
  if (!selectedAccountType) {
    return { error: "Choose the type of account you want to use before continuing." };
  }

  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return { error: "We couldn't load your account details. Refresh and try again." };
  }

  const email = getClerkPrimaryEmail(clerkUser);
  if (!email) {
    return { error: "Your Clerk account doesn't have a primary email address yet." };
  }

  if (isWebsiteOwnerEmail(email)) {
    redirect("/dashboard");
  }

  const existingChoice = getLockedAccountTypeFromClerkUser(clerkUser);
  if (existingChoice && existingChoice !== selectedAccountType) {
    return {
      error:
        "This account type has already been locked. ClearMatch only allows one permanent account type per login.",
    };
  }

  if (!existingChoice) {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        accountType: selectedAccountType,
      },
    });
  }

  const prisma = getPrismaClient();
  if (prisma) {
    const fullName =
      `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email;

    await upsertUserCompat(prisma, {
      where: { email },
      update: {
        email,
        name: fullName,
        accountType: selectedAccountType,
      },
      create: {
        id: userId,
        email,
        name: fullName,
        passwordHash: "",
        accountType: selectedAccountType,
      },
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(PENDING_ACCOUNT_TYPE_COOKIE, selectedAccountType, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });

  redirect("/dashboard");
}

export { ACCOUNT_TYPE_SETUP_PATH };
