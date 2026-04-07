import { requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  const repository = getRepository();
  const workspace = await repository.getWorkspace();

  return <AppShell workspaceName={workspace.name}>{children}</AppShell>;
}

