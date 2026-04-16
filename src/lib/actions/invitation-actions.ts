"use server";

import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getPrismaClient } from "@/lib/data/prisma";
import fs from "fs";

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync("C:/Users/zainm/invite-debug.log", line);
  } catch {}
  console.log(line.trim());
}

export async function acceptInvitation(
  token: string,
): Promise<{ success: true } | { success: false; error: string }> {
  log(`acceptInvitation called, token=${token?.slice(0, 8)}...`);
  try {
    const authResult = await auth();
    const userId = authResult?.userId;
    log(`auth userId=${userId}`);

    if (!userId) {
      return { success: false, error: "You must be signed in to accept an invitation." };
    }

    const db = getPrismaClient();
    log(`db=${db ? "ok" : "null"}`);
    if (!db) return { success: false, error: "Database not available." };

    const inv = await db.invitation.findUnique({
      where: { token },
      select: { id: true, status: true, expiresAt: true, workspaceId: true, role: true },
    });
    log(`inv=${JSON.stringify(inv)}`);

    if (!inv) return { success: false, error: "Invitation not found." };
    if (inv.status !== "PENDING")
      return { success: false, error: "This invitation has already been used or revoked." };
    if (inv.expiresAt < new Date())
      return { success: false, error: "This invitation has expired." };

    const clerkUser = await currentUser();
    log(`clerkUser=${clerkUser?.id}`);
    if (!clerkUser)
      return { success: false, error: "Could not verify your identity. Please refresh and try again." };

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    log(`email=${email}`);
    if (!email) return { success: false, error: "No email address found on your account." };

    const displayName =
      `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email;

    const existingByEmail = await db.user.findUnique({ where: { email } });
    const existingById = await db.user.findUnique({ where: { id: userId } });
    log(`existingByEmail=${existingByEmail?.id}, existingById=${existingById?.id}`);

    if (existingByEmail) {
      await db.user.update({ where: { email }, data: { name: displayName } });
      log("updated user by email");
    } else if (existingById) {
      await db.user.update({ where: { id: userId }, data: { email, name: displayName } });
      log("updated user by id");
    } else {
      await db.user.create({ data: { id: userId, email, name: displayName, passwordHash: "" } });
      log("created new user");
    }

    await db.membership.upsert({
      where: { userId_workspaceId: { userId, workspaceId: inv.workspaceId } },
      update: { role: inv.role },
      create: { userId, workspaceId: inv.workspaceId, role: inv.role },
    });
    log("membership upserted");

    await db.invitation.update({
      where: { id: inv.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    log("invitation marked accepted");

    const cookieStore = await cookies();
    cookieStore.set("active_workspace_id", inv.workspaceId, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    log("cookie set, returning success");

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    log(`CATCH: ${message}`);
    console.error("[acceptInvitation] error:", err);
    return { success: false, error: `Error: ${message}` };
  }
}
