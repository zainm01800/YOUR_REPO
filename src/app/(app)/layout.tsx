import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { RecoveryUI } from "@/components/auth/recovery-ui";
import type { ViewerAccessProfile } from "@/lib/auth/viewer-access";
import {
  ACCOUNT_TYPE_SETUP_PATH,
  getClerkPrimaryEmail,
  getLockedAccountTypeFromClerkUser,
} from "@/lib/auth/account-type";
import { isWebsiteOwnerEmail } from "@/lib/auth/viewer-access";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import type { User, Workspace, WorkspaceRole } from "@/lib/domain/types";

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

  let workspace: Workspace | null = null;
  let workspaces: Array<{ id: string; name: string; slug: string; role: WorkspaceRole }> = [];
  let storedUser: User | null = null;
  let viewerUser: User | null = null;
  let viewerAccess: ViewerAccessProfile | null = null;
  let viewAsMode: import("@/app/actions/view-as-actions").ViewAsMode = "owner";

  try {
    const access = await getServerViewerAccess();
    workspace = access.workspace;
    workspaces = access.userWorkspaces;
    storedUser = access.currentUser;
    viewerUser = access.viewerUser;
    viewerAccess = access.viewerAccess;
    viewAsMode = access.viewAsMode;

    if (!workspace || !workspaces || !storedUser) {
      redirect("/sign-up");
    }
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
      vatRegistered={workspace.vatRegistered}
      viewerAccess={viewerAccess}
      viewAsMode={viewAsMode}
    >
      {children}
    </AppShell>
  );
}
