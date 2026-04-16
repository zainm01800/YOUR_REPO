"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getPrismaClient } from "@/lib/data/prisma";

export async function acceptInvitation(token: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const db = getPrismaClient();
  if (!db) throw new Error("Database not available.");

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

  if (!inv) throw new Error("Invitation not found.");
  if (inv.status !== "PENDING") throw new Error("This invitation has already been used or revoked.");
  if (inv.expiresAt < new Date()) throw new Error("This invitation has expired.");

  // 2. Ensure user record exists in our DB (Clerk → Prisma sync)
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Could not verify your identity. Please refresh and try again.");

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("No email address found on your account.");

  const displayName =
    `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email;

  await db.user.upsert({
    where: { email },
    update: { name: displayName },
    create: { id: userId, email, name: displayName, passwordHash: "" },
  });

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

  // 5. Switch active workspace
  const cookieStore = await cookies();
  cookieStore.set("active_workspace_id", inv.workspaceId, {
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  redirect("/dashboard");
}
