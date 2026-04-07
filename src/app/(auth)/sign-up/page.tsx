import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getSession } from "@/lib/auth/session";

export default async function SignUpPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              Workspace setup
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Start with one clean finance workflow.
            </h1>
          </div>
          <ul className="space-y-3 text-sm leading-7 text-[var(--color-muted-foreground)]">
            <li>1. Create a workspace for the finance team or bookkeeper.</li>
            <li>2. Set the default currency, country profile, and tolerance.</li>
            <li>3. Upload a card export or AP spreadsheet plus receipts.</li>
            <li>4. Review exceptions, approve rows, and export clean output.</li>
          </ul>
        </Card>

        <Card>
          <form action="/api/auth/sign-up" method="post" className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                Create demo account
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Create workspace
              </h2>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Workspace name</span>
              <Input name="workspaceName" defaultValue="Northstar Finance" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Your name</span>
              <Input name="name" defaultValue="Maya Chen" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <Input name="email" type="email" defaultValue="owner@clearmatch.app" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Default currency</span>
                <Select name="currency" defaultValue="GBP">
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </Select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Country profile</span>
                <Select name="country" defaultValue="GB">
                  <option value="GB">United Kingdom</option>
                  <option value="IE">Ireland</option>
                  <option value="EU">EU general</option>
                </Select>
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Password</span>
              <Input name="password" type="password" defaultValue="DemoFinance123!" />
            </label>
            <Button className="w-full">Create workspace</Button>
          </form>
          <p className="mt-6 text-sm text-[var(--color-muted-foreground)]">
            Already have access? <Link className="font-semibold" href="/sign-in">Sign in</Link>
          </p>
        </Card>
      </div>
    </main>
  );
}

