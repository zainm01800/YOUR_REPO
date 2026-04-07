import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSession } from "@/lib/auth/session";
import { appConfig } from "@/lib/config";

export default async function SignInPage() {
  const session = await getSession();

  if (session) {
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
              Use the seeded workspace to explore upload, matching, review, exceptions,
              and export. The demo is focused on finance teams reconciling card and AP
              exports with batches of receipts.
            </p>
            <div className="rounded-3xl bg-white/10 p-5 text-sm leading-7 text-white/80">
              Demo login: <strong>{appConfig.demoCredentials.email}</strong>
              <br />
              Password: <strong>{appConfig.demoCredentials.password}</strong>
            </div>
          </div>
        </Card>

        <Card>
          <form action="/api/auth/sign-in" method="post" className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                Welcome back
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Sign in
              </h2>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <Input name="email" type="email" defaultValue={appConfig.demoCredentials.email} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Password</span>
              <Input
                name="password"
                type="password"
                defaultValue={appConfig.demoCredentials.password}
              />
            </label>
            <Button className="w-full">Sign in</Button>
          </form>
          <p className="mt-6 text-sm text-[var(--color-muted-foreground)]">
            Need a workspace? <Link className="font-semibold" href="/sign-up">Create one</Link>
          </p>
        </Card>
      </div>
    </main>
  );
}

