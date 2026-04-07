import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma__: PrismaClient | undefined;
}

export function getPrismaClient() {
  if (process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL) {
    return null;
  }

  if (!global.__prisma__) {
    global.__prisma__ = new PrismaClient();
  }

  return global.__prisma__;
}
