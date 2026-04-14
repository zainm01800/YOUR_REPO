import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { AppShell } from "@/components/app-shell/app-shell";
import { RecoveryUI } from "@/components/auth/recovery-ui";

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
    const [workspace, workspaces] = await Promise.all([
      repository.getWorkspace(),
      repository.getUserWorkspaces(),
    ]);

    if (!workspace) {
      redirect("/sign-up");
    }

    return (
      <AppShell
        workspaceName={workspace.name}
        workspaces={workspaces}
        currentWorkspaceId={workspace.id}
      >
        {children}
      </AppShell>
    );
  } catch (error) {
    console.error(`[Layout] Workspace resolution failed:`, error);
    return <RecoveryUI />;
  }
}
