"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { basePrismaRepository } from "@/lib/data/prisma-repository";
import { cookies } from "next/headers";

export async function acceptInvitationAction(token: string) {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to accept an invitation." };
  }

  const userId = user.id;
  const email = user.emailAddresses[0]?.emailAddress ?? "";
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || email;

  const result = await basePrismaRepository.acceptInvitation(token, userId, email, name);

  if (result.success && "workspaceId" in result) {
    const cookieStore = await cookies();
    cookieStore.set("active_workspace_id", result.workspaceId as string, { path: "/" });
    revalidatePath("/(app)", "layout");
    revalidatePath("/dashboard");
  }

  return result;
}

export async function resolveInvitationByCodeAction(code: string) {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const invitation = await basePrismaRepository.getInvitationByToken(code);
  if (!invitation || invitation.status !== "PENDING") {
    return { success: false, error: "Invalid or expired invitation code." };
  }

  return { success: true, invitation };
}
