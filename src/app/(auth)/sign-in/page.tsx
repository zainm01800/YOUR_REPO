import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-[linear-gradient(180deg,#143c30_0%,#1f5c45_100%)] text-white">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              Finance review workflow
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              Sign in to continue your reconciliation runs.
            </h1>
            <p className="max-w-xl text-sm leading-7 text-white/75">
              Use your Clerk account to access the hosted finance workflow, review
              exceptions, and export reconciled outputs.
            </p>
          </div>
        </Card>

        <Card className="flex items-center justify-center">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
          />
        </Card>
      </div>
    </main>
  );
}
