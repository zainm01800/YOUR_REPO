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
  const result = await basePrismaRepository.acceptInvitation(token, userId);

  if (result.success && "workspaceId" in result) {
    const cookieStore = await cookies();
    cookieStore.set("active_workspace_id", result.workspaceId as string, { path: "/" });
    revalidatePath("/(app)", "layout");
    revalidatePath("/dashboard");
  }

  return result;
}
