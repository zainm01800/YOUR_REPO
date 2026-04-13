import { mockRepository } from "@/lib/data/mock-repository";
import { getPrismaClient } from "@/lib/data/prisma";
import { prismaRepository } from "@/lib/data/prisma-repository";

export function isDemoModeEnabled() {
  // If explicitly set, respect the value
  if (process.env.DEMO_MODE !== undefined) {
    return process.env.DEMO_MODE.trim() === "true";
  }

  // Fallback: If no DATABASE_URL is set, assume demo mode for usability
  // This prevents site-wide 500 crashes for unconfigured local environments.
  if (!process.env.DATABASE_URL) {
    return true;
  }

  return false;
}

export function getRepositoryMode(): "demo" | "prisma" | "misconfigured" {
  if (isDemoModeEnabled()) {
    return "demo";
  }
  if (process.env.DATABASE_URL) {
    return "prisma";
  }
  return "misconfigured";
}

export function getRepository() {
  const demoMode = isDemoModeEnabled();

  if (demoMode) {
    return mockRepository;
  }

  const prisma = getPrismaClient();
  if (prisma) {
    return prismaRepository;
  }

  throw new Error(
    `Configuration Error: Neither DEMO_MODE=true nor DATABASE_URL are set.`,
  );
}
