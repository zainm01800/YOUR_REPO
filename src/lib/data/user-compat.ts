import { Prisma, type PrismaClient } from "@prisma/client";

const userAccountTypeColumnCache = new WeakMap<PrismaClient, Promise<boolean>>();

function isMissingUserAccountTypeColumn(error: unknown) {
  return (
    ((error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")) ||
      error instanceof Error) &&
    String(
      error instanceof Prisma.PrismaClientKnownRequestError ? error.meta?.column ?? error.message : error.message,
    ).includes("accountType")
  );
}

async function hasUserAccountTypeColumn(prisma: PrismaClient) {
  let cached = userAccountTypeColumnCache.get(prisma);
  if (!cached) {
    cached = prisma
      .$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'User'
            AND column_name = 'accountType'
        ) AS "exists"
      `)
      .then((rows) => rows[0]?.exists === true)
      .catch(() => false);
    userAccountTypeColumnCache.set(prisma, cached);
  }

  return cached;
}

export type CompatUser = {
  id: string;
  email: string;
  name: string;
  accountType: "business_user" | "accountant";
};

export async function findUserCompat(
  prisma: PrismaClient,
  where: Prisma.UserWhereUniqueInput,
): Promise<CompatUser | null> {
  if (!(await hasUserAccountTypeColumn(prisma))) {
    const legacyUser = await prisma.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!legacyUser) {
      return null;
    }

    return {
      ...legacyUser,
      accountType: "business_user",
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        accountType: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType === "accountant" ? "accountant" : "business_user",
    };
  } catch (error) {
    if (!isMissingUserAccountTypeColumn(error)) {
      throw error;
    }

    const legacyUser = await prisma.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!legacyUser) {
      return null;
    }

    return {
      ...legacyUser,
      accountType: "business_user",
    };
  }
}

export async function upsertUserCompat(
  prisma: PrismaClient,
  input: {
    where: Prisma.UserWhereUniqueInput;
    update: { email?: string; name?: string; accountType?: "business_user" | "accountant" };
    create: {
      id: string;
      email: string;
      name: string;
      passwordHash: string;
      accountType?: "business_user" | "accountant";
    };
  },
): Promise<CompatUser> {
  if (!(await hasUserAccountTypeColumn(prisma))) {
    const legacyUser = await prisma.user.upsert({
      where: input.where,
      update: {
        email: input.update.email,
        name: input.update.name,
      },
      create: {
        id: input.create.id,
        email: input.create.email,
        name: input.create.name,
        passwordHash: input.create.passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return {
      ...legacyUser,
      accountType: "business_user",
    };
  }

  try {
    const user = await prisma.user.upsert({
      where: input.where,
      update: {
        email: input.update.email,
        name: input.update.name,
        accountType: input.update.accountType,
      },
      create: {
        id: input.create.id,
        email: input.create.email,
        name: input.create.name,
        passwordHash: input.create.passwordHash,
        accountType: input.create.accountType ?? "business_user",
      },
      select: {
        id: true,
        email: true,
        name: true,
        accountType: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType === "accountant" ? "accountant" : "business_user",
    };
  } catch (error) {
    if (!isMissingUserAccountTypeColumn(error)) {
      throw error;
    }

    const legacyUser = await prisma.user.upsert({
      where: input.where,
      update: {
        email: input.update.email,
        name: input.update.name,
      },
      create: {
        id: input.create.id,
        email: input.create.email,
        name: input.create.name,
        passwordHash: input.create.passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return {
      ...legacyUser,
      accountType: "business_user",
    };
  }
}
