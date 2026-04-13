import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  console.log(`[Layout] userId: ${userId}`);

  if (!userId) {
    console.log("[Layout] No userId, redirecting to sign-in");
    redirect("/sign-in");
  }

  const repository = getRepository();
  const workspace = await repository.getWorkspace();

  if (!workspace) {
    redirect("/sign-up");
  }

  return <AppShell workspaceName={workspace.name}>{children}</AppShell>;
}
