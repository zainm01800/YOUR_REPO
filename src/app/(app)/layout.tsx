import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { AppShell } from "@/components/app-shell/app-shell";
import { RecoveryUI } from "@/components/auth/recovery-ui";
import { buildViewerAccessProfile } from "@/lib/auth/viewer-access";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  try {
    const repository = await getRepository();
    const [workspace, workspaces, currentUser] = await Promise.all([
      repository.getWorkspace(),
      repository.getUserWorkspaces(),
      repository.getCurrentUser(),
    ]);

    if (!workspace) {
      redirect("/sign-up");
    }

    const viewerAccess = buildViewerAccessProfile(currentUser, workspace);

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
  } catch (error: any) {
    console.error(`[Layout] Workspace resolution failed:`, error);
    return <RecoveryUI message={error?.message} />;
  }
}
