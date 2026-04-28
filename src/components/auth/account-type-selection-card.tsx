"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, BriefcaseBusiness, Calculator, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import type { UserAccountType } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { lockAccountTypeChoice } from "@/app/account-type/actions";
import { cn } from "@/lib/utils";

type State = { error?: string } | null;

const options: Array<{
  id: UserAccountType;
  title: string;
  subtitle: string;
  icon: typeof Calculator;
  bullets: string[];
}> = [
  {
    id: "business_user",
    title: "Business account",
    subtitle: "For sole traders, founders, and internal business users doing their own bookkeeping prep.",
    icon: BriefcaseBusiness,
    bullets: [
      "Upload statements and receipts",
      "Categorise transactions and review VAT",
      "Get the simpler owner-facing workspace",
    ],
  },
  {
    id: "accountant",
    title: "Accountant account",
    subtitle: "For accountants and bookkeepers managing reviews, templates, and advanced accounting outputs.",
    icon: Calculator,
    bullets: [
      "See the full accounting and reporting view",
      "Access templates, posting tools, and deeper controls",
      "Work in the accountant-style review workflow",
    ],
  },
];

export function AccountTypeSelectionCard({
  defaultAccountType,
  email,
}: {
  defaultAccountType: UserAccountType;
  email: string;
}) {
  const [selected, setSelected] = useState<UserAccountType>(defaultAccountType);
  const [state, action, pending] = useActionState<State, FormData>(lockAccountTypeChoice, null);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selected) ?? options[0],
    [selected],
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              One-time account setup
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--color-foreground)]">
              Choose the permanent account type for this login.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted-foreground)]">
              Every existing and new account has to be either a business account or an accountant
              account. This choice shapes the product you see and cannot be changed later.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
            <p className="font-medium text-[var(--color-foreground)]">{email}</p>
            <p className="mt-1">
              The choice you confirm below is locked to this sign-in and will stay with the account.
            </p>
          </div>

          <div className="space-y-3">
            {options.map((option) => {
              const selectedCard = selected === option.id;
              const Icon = option.icon;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelected(option.id)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition",
                    selectedCard
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-sm"
                      : "border-[var(--color-border)] bg-white hover:border-[var(--color-accent)]/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-accent)] shadow-sm">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                          {option.title}
                        </h2>
                        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                          {option.subtitle}
                        </p>
                      </div>
                    </div>
                    {selectedCard && (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--color-accent)]" />
                    )}
                  </div>

                  <ul className="mt-3 space-y-1.5 text-sm text-[var(--color-muted-foreground)]">
                    {option.bullets.map((bullet) => (
                      <li key={bullet}>- {bullet}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <form action={action} className="space-y-4">
            <input type="hidden" name="accountType" value={selected} />

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Permanent choice</p>
              <p className="mt-1 leading-6">
                    You are confirming <span className="font-semibold">{selectedOption.title}</span>.
                    This account type is permanent and is not changeable later in settings.
                  </p>
                  <p className="mt-2 leading-6">
                    Your workspace owner can still decide what access level you hold inside a
                    workspace, but they cannot switch this login between business and accountant
                    mode after you lock it.
                  </p>
                </div>
              </div>
            </div>

            {state?.error && (
              <p className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                {state.error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={pending} className="gap-2">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {pending ? "Saving choice..." : `Lock ${selectedOption.title}`}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="bg-[linear-gradient(180deg,#143c30_0%,#1f5c45_100%)] text-white">
          <div className="space-y-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                Why we lock it
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Clear roles make the product easier to trust.
              </h2>
            </div>

            <div className="space-y-4 text-sm leading-7 text-white/80">
              <p>
                Business accounts stay focused on day-to-day prep work like uploads, reconciliation,
                VAT review, and cleaner bookkeeping workflows.
              </p>
              <p>
                Accountant accounts keep the broader review and advanced accounting layer, including
                templates, posting outputs, and the deeper reporting screens.
              </p>
              <p>
                Locking the account type once avoids confusing role switching later. Workspace
                owners can still invite you as view only, bookkeeper, tax reviewer, or accountant
                admin depending on the work they want you to handle.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
