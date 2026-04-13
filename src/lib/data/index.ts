import { mockRepository } from "@/lib/data/mock-repository";
import { getPrismaClient } from "@/lib/data/prisma";
import { prismaRepository } from "@/lib/data/prisma-repository";

export function isDemoModeEnabled() {
  return process.env.DEMO_MODE === "true";
}

export function getRepositoryMode() {
  if (isDemoModeEnabled()) {
    return "demo" as const;
  }

  if (getPrismaClient()) {
    return "database" as const;
  }

  return "misconfigured" as const;
}

export function getRepository() {
  if (isDemoModeEnabled()) {
    return mockRepository;
  }

  if (getPrismaClient()) {
    return prismaRepository;
  }

  throw new Error(
    "DATABASE_URL is not configured for this deployment. Set DEMO_MODE=true only for demo environments, or configure a real database for persistent data.",
  );
}
