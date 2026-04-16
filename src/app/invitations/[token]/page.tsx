import { AcceptInvitationButton } from "@/components/invitations/accept-invitation-button";
import { basePrismaRepository } from "@/lib/data/prisma-repository";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, UserPlus } from "lucide-react";

export default async function InvitationPage(props: {
  params: Promise<{ token: string }>;
}) {
  const params = await props.params;
  const invitation = await basePrismaRepository.getInvitationByToken(params.token);

  if (!invitation || invitation.status !== "PENDING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-6">
        <Card className="max-w-md w-full border-red-100 bg-red-50/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              This invitation link is invalid, has expired, or has already been accepted.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/50 p-6">
      <Card className="max-w-md w-full shadow-xl shadow-indigo-100/20 border-indigo-100">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
            <UserPlus className="w-6 h-6 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
            Workspace Invitation
          </CardTitle>
          <CardDescription className="text-gray-500 mt-2">
            <strong>{invitation.invitedByName}</strong> has invited you to join their workspace.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-4">
          <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4 border border-gray-100">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
              <Building2 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Target Workspace</p>
              <p className="text-xs text-gray-500">You will join as a <strong>{invitation.role}</strong></p>
            </div>
          </div>

          <div className="pt-2">
            <AcceptInvitationButton token={params.token} />
          </div>

          <p className="text-center text-[11px] text-gray-400">
            By joining, you will have access to reconciliation runs and transaction history for this workspace.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
