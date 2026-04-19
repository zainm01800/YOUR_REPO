import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { AppShell } from "@/components/app-shell/app-shell";
import { RecoveryUI } from "@/components/auth/recovery-ui";
import { buildViewerAccessProfile } from "@/lib/auth/viewer-access";
import {
  ACCOUNT_TYPE_SETUP_PATH,
  getClerkPrimaryEmail,
  getLockedAccountTypeFromClerkUser,
} from "@/lib/auth/account-type";
import { isWebsiteOwnerEmail } from "@/lib/auth/viewer-access";
import { resolveViewerUser } from "@/lib/auth/viewer-user";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect("/sign-in");
  }

  const clerkEmail = getClerkPrimaryEmail(clerkUser);
  const isOwner = isWebsiteOwnerEmail(clerkEmail);
  const lockedAccountType = getLockedAccountTypeFromClerkUser(clerkUser);

  if (!isOwner && !lockedAccountType) {
    redirect(ACCOUNT_TYPE_SETUP_PATH);
  }

  let workspace;
  let workspaces;
  let storedUser;

  try {
    const repository = await getRepository();
    [workspace, workspaces, storedUser] = await Promise.all([
      repository.getWorkspace(),
      repository.getUserWorkspaces(),
      repository.getCurrentUser(),
    ]);
  } catch (error: any) {
    console.error(`[Layout] Workspace resolution failed:`, error);
    return <RecoveryUI message={error?.message} />;
  }

  if (!workspace || !workspaces || !storedUser) {
    redirect("/sign-up");
  }

  const viewerUser = await resolveViewerUser(storedUser);
  const viewerAccess = buildViewerAccessProfile(viewerUser, workspace);

  return (
    <AppShell
      workspaceName={workspace.name}
      workspaces={workspaces}
      currentWorkspaceId={workspace.id}
      businessType={workspace.businessType}
      viewerAccess={viewerAccess}
    >
      {children}
    </AppShell>
  );
}
