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
  let viewerUser;
  let viewerAccess;

  try {
    const repository = await getRepository();
    [workspace, workspaces, storedUser] = await Promise.all([
      repository.getWorkspace(),
      repository.getUserWorkspaces(),
      repository.getCurrentUser(),
    ]);

    if (!workspace || !workspaces || !storedUser) {
      redirect("/sign-up");
    }

    viewerUser = await resolveViewerUser(storedUser);
    viewerAccess = buildViewerAccessProfile(viewerUser, workspace);
  } catch (error: any) {
    // Re-throw redirects so Next.js can handle them properly
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error(`[Layout] Workspace resolution failed:`, error);
    return <RecoveryUI message={error?.message} />;
  }

  if (!viewerUser || !viewerAccess) {
    redirect("/sign-up");
  }

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
