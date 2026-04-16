import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getPrismaClient } from "@/lib/data/prisma";
import { auth } from "@clerk/nextjs/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, ShieldCheck, Mail, ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  accountant: "Accountant",
  viewer: "Viewer",
};

export default async function InvitationPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const token = params.token;
  const { userId } = await auth();

  if (!userId) {
    redirect(`/sign-in?redirect_url=/invitations/${token}`);
  }

  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database not available");

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { workspace: true, invitedBy: true },
  });

  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] p-6">
        <Card className="max-w-md w-full text-center py-12 px-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mb-6">
            <Mail className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Invalid Invitation</h1>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            This invitation link is invalid, has expired, or has already been used.
          </p>
          <Link href="/dashboard" className="mt-8 inline-block underline text-sm">
            Back to Dashboard
          </Link>
        </Card>
      </div>
    );
  }

  // Check if already a member
  const existingMembership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: invitation.workspaceId } },
  });

  if (existingMembership) {
    // Already a member — just switch to that workspace and redirect
    const cookieStore = await cookies();
    cookieStore.set("active_workspace_id", invitation.workspaceId, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    redirect("/dashboard");
  }

  async function acceptAction() {
    "use server";

    const { userId: currentUserId } = await auth();
    if (!currentUserId) redirect("/sign-in");

    const db = getPrismaClient();
    if (!db) throw new Error("Database not available");

    // Re-fetch invitation fresh (don't rely on closure variables)
    const inv = await db.invitation.findUnique({ where: { token } });

    if (!inv || inv.status !== "PENDING" || inv.expiresAt < new Date()) {
      throw new Error("This invitation is no longer valid or has expired.");
    }

    // Ensure the user record exists in our DB
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkUser = await currentUser();
    if (!clerkUser) throw new Error("Could not verify your identity. Please refresh and try again.");

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) throw new Error("No email address found on your account.");

    const displayName = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email;

    await db.user.upsert({
      where: { email },
      update: { name: displayName },
      create: { id: currentUserId, email, name: displayName, passwordHash: "" },
    });

    // Create (or update) membership
    await db.membership.upsert({
      where: { userId_workspaceId: { userId: currentUserId, workspaceId: inv.workspaceId } },
      update: { role: inv.role },
      create: { userId: currentUserId, workspaceId: inv.workspaceId, role: inv.role },
    });

    // Mark invitation as accepted
    await db.invitation.update({
      where: { id: inv.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    // Switch to the invited workspace
    const cookieStore = await cookies();
    cookieStore.set("active_workspace_id", inv.workspaceId, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] p-6">
      <Card className="max-w-md w-full p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 mb-6 shadow-sm border border-blue-100">
            <Landmark className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[var(--color-foreground)] tracking-tight">
              Workspace Invitation
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              You&apos;ve been invited to join
              <span className="font-semibold text-[var(--color-foreground)] block mt-1 text-lg">
                {invitation.workspace.name}
              </span>
            </p>
          </div>

          <div className="mt-8 w-full space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 text-left">
              <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Role Granted</p>
                <p className="text-sm font-semibold text-slate-700 capitalize">
                  {ROLE_LABELS[invitation.role] ?? invitation.role}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border)] text-left">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Invited by{" "}
                <span className="font-semibold text-[var(--color-foreground)]">
                  {invitation.invitedBy.name}
                </span>
                {invitation.expiresAt && (
                  <span>
                    {" "}· Expires{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 w-full">
            <form action={acceptAction}>
              <Button className="w-full rounded-2xl py-6 text-base font-semibold gap-2 shadow-sm">
                Accept Invitation
                <ArrowRight className="h-5 w-5" />
              </Button>
            </form>

            <p className="text-xs text-slate-400 mt-1">
              Accepting will switch your active workspace to{" "}
              <span className="font-semibold">{invitation.workspace.name}</span>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
