import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              Workspace access
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Create your account and start a reconciliation workspace.
            </h1>
          </div>
          <ul className="space-y-3 text-sm leading-7 text-[var(--color-muted-foreground)]">
            <li>1. Create an account with Clerk.</li>
            <li>2. Sign in to the hosted app.</li>
            <li>3. Review uploads, exceptions, and exports inside ClearMatch.</li>
          </ul>
        </Card>

        <Card className="flex items-center justify-center">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            forceRedirectUrl="/dashboard"
          />
        </Card>
      </div>
    </main>
  );
}
