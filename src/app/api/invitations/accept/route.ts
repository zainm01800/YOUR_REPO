import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { getPrismaClient } from "@/lib/data/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ success: false, error: "No token provided." }, { status: 400 });
    }

    const db = getPrismaClient();
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available." }, { status: 503 });
    }

    // 1. Load and validate the invitation
    const inv = await db.invitation.findUnique({
      where: { token },
      select: { id: true, status: true, expiresAt: true, workspaceId: true, role: true },
    });

    if (!inv) return NextResponse.json({ success: false, error: "Invitation not found." });
    if (inv.status !== "PENDING")
      return NextResponse.json({ success: false, error: "This invitation has already been used or revoked." });
    if (inv.expiresAt < new Date())
      return NextResponse.json({ success: false, error: "This invitation has expired." });

    // 2. Sync user record
    const clerkUser = await currentUser();
    if (!clerkUser)
      return NextResponse.json({ success: false, error: "Could not verify your identity." });

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return NextResponse.json({ success: false, error: "No email on account." });

    const displayName =
      `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email;

    const existingByEmail = await db.user.findUnique({ where: { email } });
    const existingById = await db.user.findUnique({ where: { id: userId } });

    if (existingByEmail) {
      await db.user.update({ where: { email }, data: { name: displayName } });
    } else if (existingById) {
      await db.user.update({ where: { id: userId }, data: { email, name: displayName } });
    } else {
      await db.user.create({ data: { id: userId, email, name: displayName, passwordHash: "" } });
    }

    // 3. Create (or update) membership
    await db.membership.upsert({
      where: { userId_workspaceId: { userId, workspaceId: inv.workspaceId } },
      update: { role: inv.role },
      create: { userId, workspaceId: inv.workspaceId, role: inv.role },
    });

    // 4. Mark invitation accepted
    await db.invitation.update({
      where: { id: inv.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    // 5. Set active workspace cookie
    const cookieStore = await cookies();
    cookieStore.set("active_workspace_id", inv.workspaceId, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/invitations/accept]", message, err);
    return NextResponse.json({ success: false, error: `Server error: ${message}` }, { status: 500 });
  }
}
