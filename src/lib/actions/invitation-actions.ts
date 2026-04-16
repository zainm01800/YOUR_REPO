"use server";

import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getPrismaClient } from "@/lib/data/prisma";

export async function acceptInvitation(
  token: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const authResult = await auth();
    const userId = authResult?.userId;

    if (!userId) {
      return { success: false, error: "You must be signed in to accept an invitation." };
    }

    const db = getPrismaClient();
    if (!db) return { success: false, error: "Database not available." };

    // 1. Load and validate the invitation
    const inv = await db.invitation.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        workspaceId: true,
        role: true,
      },
    });

    if (!inv) return { success: false, error: "Invitation not found." };
    if (inv.status !== "PENDING")
      return { success: false, error: "This invitation has already been used or revoked." };
    if (inv.expiresAt < new Date())
      return { success: false, error: "This invitation has expired." };

    // 2. Ensure user record exists in our DB (Clerk → Prisma sync)
    const clerkUser = await currentUser();
    if (!clerkUser)
      return {
        success: false,
        error: "Could not verify your identity. Please refresh and try again.",
      };

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return { success: false, error: "No email address found on your account." };

    const displayName =
      `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email;

    // Sync user record — handle all three cases to avoid unique constraint violations
    const existingByEmail = await db.user.findUnique({ where: { email } });
    const existingById = await db.user.findUnique({ where: { id: userId } });

    if (existingByEmail) {
      await db.user.update({ where: { email }, data: { name: displayName } });
    } else if (existingById) {
      await db.user.update({ where: { id: userId }, data: { email, name: displayName } });
    } else {
      await db.user.create({
        data: { id: userId, email, name: displayName, passwordHash: "" },
      });
    }

    // 3. Create (or idempotently update) the membership
    await db.membership.upsert({
      where: { userId_workspaceId: { userId, workspaceId: inv.workspaceId } },
      update: { role: inv.role },
      create: { userId, workspaceId: inv.workspaceId, role: inv.role },
    });

    // 4. Mark as accepted
    await db.invitation.update({
      where: { id: inv.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    // 5. Switch active workspace cookie
    const cookieStore = await cookies();
    cookieStore.set("active_workspace_id", inv.workspaceId, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    console.error("[acceptInvitation] error:", message, err);
    return { success: false, error: `Error: ${message}` };
  }
}
