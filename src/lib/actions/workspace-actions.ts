"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPrismaClient } from "@/lib/data/prisma";
import { getRepository } from "@/lib/data";
import { randomBytes } from "crypto";

// ─── Workspace switching ─────────────────────────────────────────────────────

export async function setActiveWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set("active_workspace_id", workspaceId, {
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  redirect("/dashboard");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function requireAdminRepo() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database not available");
  const repo = await getRepository();
  const workspace = await repo.getWorkspace();
  const workspaces = await repo.getUserWorkspaces();
  const membership = workspaces.find((w) => w.id === workspace.id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Permission denied: you must be an owner or admin to manage team access.");
  }
  return { prisma, workspace, repo };
}

// ─── Invite user ─────────────────────────────────────────────────────────────

export async function inviteUser(
  email: string,
  role: string,
): Promise<{ success: true; inviteLink: string } | { success: false; error: string }> {
  try {
    const { prisma, workspace } = await requireAdminRepo();
    const repo = await getRepository();
    const currentUser = await repo.getCurrentUser();

    const normalised = email.trim().toLowerCase();
    if (!normalised || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalised)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    const validRoles = ["admin", "accountant", "viewer"];
    if (!validRoles.includes(role)) {
      return { success: false, error: "Invalid role selected." };
    }

    // Check not already a member
    const existingUser = await prisma.user.findUnique({ where: { email: normalised } });
    if (existingUser) {
      const existingMembership = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: existingUser.id, workspaceId: workspace.id } },
      });
      if (existingMembership) {
        return { success: false, error: `${normalised} is already a member of this workspace.` };
      }
    }

    // Revoke any existing PENDING invite for this email in this workspace
    await prisma.invitation.updateMany({
      where: { workspaceId: workspace.id, email: normalised, status: "PENDING" },
      data: { status: "REVOKED" },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.invitation.create({
      data: {
        email: normalised,
        role,
        token,
        workspaceId: workspace.id,
        invitedById: currentUser.id,
        expiresAt,
      },
    });

    const inviteLink = `${getBaseUrl()}/invitations/${token}`;
    console.log(`[Invite] ${normalised} → ${inviteLink}`);

    return { success: true, inviteLink };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to create invitation." };
  }
}

// ─── Remove member ────────────────────────────────────────────────────────────

export async function removeMember(
  membershipId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { prisma, workspace } = await requireAdminRepo();

    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.workspaceId !== workspace.id) {
      return { success: false, error: "Membership not found." };
    }
    if (membership.role === "owner") {
      return { success: false, error: "The workspace owner cannot be removed." };
    }

    await prisma.membership.delete({ where: { id: membershipId } });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to remove member." };
  }
}

// ─── Update member role ───────────────────────────────────────────────────────

export async function updateMemberRole(
  membershipId: string,
  newRole: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { prisma, workspace } = await requireAdminRepo();

    const validRoles = ["admin", "accountant", "viewer"];
    if (!validRoles.includes(newRole)) {
      return { success: false, error: "Invalid role." };
    }

    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.workspaceId !== workspace.id) {
      return { success: false, error: "Membership not found." };
    }
    if (membership.role === "owner") {
      return { success: false, error: "The owner role cannot be changed." };
    }

    await prisma.membership.update({ where: { id: membershipId }, data: { role: newRole } });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to update role." };
  }
}

// ─── Delete workspace ─────────────────────────────────────────────────────────

export async function deleteWorkspace(
  workspaceId: string,
  confirmName: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { prisma, workspace } = await requireAdminRepo();

    if (workspace.id !== workspaceId) {
      return { success: false, error: "Workspace mismatch." };
    }

    // Only the owner can delete
    const repo = await getRepository();
    const workspaces = await repo.getUserWorkspaces();
    const membership = workspaces.find((w) => w.id === workspaceId);
    if (!membership || membership.role !== "owner") {
      return { success: false, error: "Only the workspace owner can delete it." };
    }

    // Require the user to type the exact workspace name as confirmation
    if (confirmName.trim() !== workspace.name) {
      return { success: false, error: "Workspace name does not match. Deletion cancelled." };
    }

    // Delete — CASCADE in the schema removes all runs, statements, rules, members, invites
    await prisma.workspace.delete({ where: { id: workspaceId } });

    // Clear the active workspace cookie so the layout picks up another workspace (or prompts creation)
    const cookieStore = await cookies();
    cookieStore.delete("active_workspace_id");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete workspace." };
  }
}

// ─── Revoke invitation ────────────────────────────────────────────────────────

export async function revokeInvitation(
  invitationId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { prisma, workspace } = await requireAdminRepo();

    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation || invitation.workspaceId !== workspace.id) {
      return { success: false, error: "Invitation not found." };
    }
    if (invitation.status !== "PENDING") {
      return { success: false, error: "Only pending invitations can be revoked." };
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "REVOKED" },
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to revoke invitation." };
  }
}
