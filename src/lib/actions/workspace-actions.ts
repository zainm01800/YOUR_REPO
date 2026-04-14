"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPrismaClient } from "@/lib/data/prisma";
import { getRepository } from "@/lib/data";
import { randomBytes } from "crypto";

export async function setActiveWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set("active_workspace_id", workspaceId, {
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // Redirect to dashboard to refresh data context
  redirect("/dashboard");
}

export async function inviteUser(email: string, role: string) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database not available");

  const repo = await getRepository();
  const workspace = await repo.getWorkspace();
  const user = await repo.getCurrentUser();

  // Generate a random token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  await prisma.invitation.create({
    data: {
      email,
      role,
      token,
      workspaceId: workspace.id,
      invitedById: user.id,
      expiresAt,
    },
  });

  // In a real app, send an email here
  console.log(`Invitation sent to ${email} with token: ${token}`);
  
  return { success: true };
}
