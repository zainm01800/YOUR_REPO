import { redirect } from "next/navigation";
import { getPrismaClient } from "@/lib/data/prisma";
import { auth } from "@clerk/nextjs/server";
import { Card } from "@/components/ui/card";
import { Landmark, ShieldCheck, Mail, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { AcceptInvitationButton } from "@/components/invitations/accept-invitation-button";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  accountant: "Accountant",
  viewer: "Viewer",
};

export default async function InvitationPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const token = params.token;

  try {
    const { userId } = await auth();

    if (!userId) {
      redirect(`/sign-in?redirect_url=/invitations/${token}`);
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      return <ErrorCard message="Database not available. Please try again later." />;
    }

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

            <div className="mt-6 w-full">
              <AcceptInvitationButton token={token} />
              <p className="text-xs text-slate-400 mt-3">
                Accepting will switch your active workspace to{" "}
                <span className="font-semibold">{invitation.workspace.name}</span>.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  } catch (err) {
    // Let Next.js handle redirects normally
    const digest = (err as { digest?: string }).digest;
    if (digest?.startsWith("NEXT_REDIRECT")) throw err;

    const message = err instanceof Error ? err.message : String(err);
    console.error("[InvitationPage] render error:", err);
    return <ErrorCard message={message} />;
  }
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] p-6">
      <Card className="max-w-md w-full text-center py-12 px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mb-6">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Something went wrong</h1>
        <p className="mt-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-left text-red-700 break-all">
          {message}
        </p>
        <Link href="/dashboard" className="mt-8 inline-block underline text-sm">
          Back to Dashboard
        </Link>
      </Card>
    </div>
  );
}
