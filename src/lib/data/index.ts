import { mockRepository } from "@/lib/data/mock-repository";
import { getPrismaClient } from "@/lib/data/prisma";
import { prismaRepository } from "@/lib/data/prisma-repository";

export function getRepository() {
  if (getPrismaClient()) {
    return prismaRepository;
  }

  return mockRepository;
}
