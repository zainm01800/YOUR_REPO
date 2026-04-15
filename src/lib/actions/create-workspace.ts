"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getPrismaClient } from "@/lib/data/prisma";
import { mergeWorkspaceCategoryRules } from "@/lib/accounting/default-categories";
import { demoStore } from "@/lib/demo/demo-store";

export async function createWorkspace(
  _prevState: { error?: string } | null,
  formData: FormData,
) {
  const name = (formData.get("name") as string | null)?.trim();
  if (!name || name.length < 2) {
    return { error: "Workspace name must be at least 2 characters." };
  }
  if (name.length > 80) {
    return { error: "Workspace name must be 80 characters or fewer." };
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return { error: "Database not available." };
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return { error: "Not authenticated." };
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    return { error: "No email address found on your account." };
  }

  // Resolve or create the user row
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email },
    create: {
      id: clerkUser.id,
      email,
      name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email,
      passwordHash: "",
    },
  });

  // Build a unique slug from the workspace name
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  // Create the workspace and owner membership
  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      amountTolerance: 1.5,
      dateToleranceDays: 5,
      vatRegistered: false,
      businessType: "sole_trader",
    },
  });

  await prisma.membership.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      role: "owner",
    },
  });

  // Seed default VAT rules
  await prisma.vatRule.createMany({
    data: demoStore.vatRules.map((rule) => ({
      workspaceId: workspace.id,
      countryCode: rule.countryCode,
      rate: rule.rate,
      taxCode: rule.taxCode,
      recoverable: rule.recoverable,
      description: rule.description,
    })),
    skipDuplicates: true,
  });

  // Seed default GL code rules
  await prisma.glCodeRule.createMany({
    data: demoStore.glRules.map((rule) => ({
      workspaceId: workspace.id,
      glCode: rule.glCode,
      label: rule.label,
      supplierPattern: rule.supplierPattern,
      keywordPattern: rule.keywordPattern,
      priority: rule.priority,
    })),
    skipDuplicates: true,
  });

  // Seed default category rules
  const merged = mergeWorkspaceCategoryRules([]);
  if (merged.length > 0) {
    await prisma.categoryRule.createMany({
      data: merged.map((r) => ({
        workspaceId: workspace.id,
        category: r.category,
        slug: r.slug ?? r.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: r.description,
        section: r.section ?? "Other & Special",
        supplierPattern: r.supplierPattern,
        keywordPattern: r.keywordPattern,
        priority: r.priority,
        accountType: r.accountType,
        statementType: r.statementType,
        reportingBucket: r.reportingBucket,
        defaultTaxTreatment: r.defaultTaxTreatment,
        defaultVatRate: r.defaultVatRate,
        defaultVatRecoverable: r.defaultVatRecoverable ?? true,
        glCode: r.glCode,
        isActive: r.isActive ?? true,
        allowableForTax: r.allowableForTax ?? true,
        allowablePercentage: r.allowablePercentage ?? 100,
      })),
      skipDuplicates: true,
    });
  }

  // Switch to the new workspace
  const cookieStore = await cookies();
  cookieStore.set("active_workspace_id", workspace.id, {
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  redirect("/dashboard");
}
