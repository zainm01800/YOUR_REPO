import { cache } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { mockRepository } from "@/lib/data/mock-repository";
import { getPrismaClient } from "@/lib/data/prisma";
import { createPrismaRepository } from "@/lib/data/prisma-repository";

export function isDemoModeEnabled() {
  if (process.env.DEMO_MODE !== undefined) {
    return process.env.DEMO_MODE.trim() === "true";
  }
  if (!process.env.DATABASE_URL) {
    return true;
  }
  return false;
}

export function getRepositoryMode(): "demo" | "prisma" | "misconfigured" {
  if (isDemoModeEnabled()) return "demo";
  if (process.env.DATABASE_URL) return "prisma";
  return "misconfigured";
}

export const getRepository = cache(async () => {
  const demoMode = isDemoModeEnabled();
  if (demoMode) {
    return mockRepository;
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("Prisma client not initialized");
  }

  // Multi-tenancy: Resolve the user from the current Clerk session
  const user = await currentUser();
  if (!user) {
    throw new Error("Authentication required: No user found in session.");
  }

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error("User has no email address associated with their account.");
  }

  // Resolve the individual workspace for this user
  // (We'll implement this helper in prisma-repository)
  const repo = await createPrismaRepository(prisma, {
    clerkId: user.id,
    email,
    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || email,
  });

  return repo;
});
