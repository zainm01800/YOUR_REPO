import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { type PrismaClient } from "@prisma/client";
import { demoStore } from "@/lib/demo/demo-store";
import { getLockedAccountTypeFromClerkUser } from "@/lib/auth/account-type";
import {
  normalizePendingAccountType,
  normalizePendingBusinessType,
  PENDING_ACCOUNT_TYPE_COOKIE,
  PENDING_BUSINESS_TYPE_COOKIE,
} from "@/lib/auth/account-intent";
import { upsertUserCompat } from "@/lib/data/user-compat";

export interface UserContext {
  clerkId: string;
  email: string;
  name: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getResilientClerkUser(retries = 3) {
  for (let i = 0; i < retries; i++) {
    const user = await currentUser();
    if (user) return user;
    if (i < retries - 1) {
      console.log(`[Auth] Session cold, retrying in 1s... (Attempt ${i + 1})`);
      await sleep(1000);
    }
  }
  return null;
}

export const resolveUserWorkspace = async (prisma: PrismaClient) => {
  const clerkUser = await getResilientClerkUser();
  if (!clerkUser) {
    throw new Error("Authentication session failed to synchronize. Please refresh the page.");
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error("User has no email address associated with their account.");
  }

  const context: UserContext = {
    clerkId: clerkUser.id,
    email,
    name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email,
  };

  const cookieStore = await cookies();
  const pendingAccountType = normalizePendingAccountType(
    cookieStore.get(PENDING_ACCOUNT_TYPE_COOKIE)?.value,
  );
  const lockedAccountType = getLockedAccountTypeFromClerkUser(clerkUser);
  const effectiveAccountType = lockedAccountType ?? pendingAccountType;
  const pendingBusinessType = normalizePendingBusinessType(
    cookieStore.get(PENDING_BUSINESS_TYPE_COOKIE)?.value,
  );

  // 1. Resolve or Create the User in our DB
  const user = await upsertUserCompat(prisma, {
    where: { email: context.email },
    update: { name: context.name, accountType: effectiveAccountType },
    create: {
      id: context.clerkId, // Use Clerk ID for consistency
      email: context.email,
      name: context.name,
      passwordHash: "", // Clerk handles passwords
      accountType: effectiveAccountType,
    },
  });
  const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;

  let membership;

  if (activeWorkspaceId) {
    membership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        workspaceId: activeWorkspaceId,
      },
      include: { workspace: true },
    });
  }

  // Fallback to the first available membership if no active one or invalid
  if (!membership) {
    membership = await prisma.membership.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    });
  }

  let isNewWorkspace = false;
  if (!membership) {
    isNewWorkspace = true;
    // New user signup onboarding: create a private workspace
    const workspaceSlug = (context.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "workspace") + "-" + user.id.slice(-4);
    
    try {
      const workspace = await prisma.workspace.create({
        data: {
          name: `${context.name}'s Workspace`,
          slug: workspaceSlug,
          amountTolerance: 0.05,
          dateToleranceDays: 5,
          vatRegistered: false,
          businessType: pendingBusinessType,
        },
      });

      membership = await prisma.membership.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: "owner",
        },
        include: { workspace: true },
      });
    } catch (e: any) {
      // If concurrent request already created it, find it
      if (e.code === "P2002") {
        membership = await prisma.membership.findFirst({
          where: { userId: user.id },
          include: { workspace: true },
        });
        if (!membership) throw e; // Rethrow if it wasn't the membership that existed
        isNewWorkspace = false; // It exists now, so it's not "new" for THIS request
      } else {
        throw e;
      }
    }
  }

  // Final check to ensure membership exists
  if (!membership) {
    throw new Error("Failed to resolve or create a workspace for the user.");
  }

  // Seed default rules for the new private workspace if we were the creator
  if (isNewWorkspace && membership) {
    await seedDefaultRules(prisma, membership.workspace.id);
    cookieStore.delete(PENDING_ACCOUNT_TYPE_COOKIE);
    cookieStore.delete(PENDING_BUSINESS_TYPE_COOKIE);
  }

  return {
    userId: user.id,
    user,
    workspaceId: membership.workspace.id,
    workspace: membership.workspace,
    isNewWorkspace,
  };
};

async function seedDefaultRules(prisma: PrismaClient, workspaceId: string) {
  // Seed demo rules as defaults for new users
  await prisma.vatRule.createMany({
    data: demoStore.vatRules.map((rule) => ({
      workspaceId,
      countryCode: rule.countryCode,
      rate: rule.rate,
      taxCode: rule.taxCode,
      recoverable: rule.recoverable,
      description: rule.description,
    })),
    skipDuplicates: true,
  });

  await prisma.glCodeRule.createMany({
    data: demoStore.glRules.map((rule) => ({
      workspaceId,
      glCode: rule.glCode,
      label: rule.label,
      supplierPattern: rule.supplierPattern,
      keywordPattern: rule.keywordPattern,
      priority: rule.priority,
    })),
    skipDuplicates: true,
  });
}
