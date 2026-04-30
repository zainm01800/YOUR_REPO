"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, Calculator, CheckCircle2, ShieldCheck } from "lucide-react";
import { SignUp } from "@clerk/nextjs";
import type { BusinessType, UserAccountType } from "@/lib/domain/types";
import {
  PENDING_ACCOUNT_TYPE_COOKIE,
  PENDING_BUSINESS_TYPE_COOKIE,
} from "@/lib/auth/account-intent";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

type AccountOption = {
  id: UserAccountType;
  title: string;
  subtitle: string;
  bullets: string[];
};

const accountOptions: AccountOption[] = [
  {
    id: "business_user",
    title: "Business account",
    subtitle: "For sole traders and business owners doing their own prep work.",
    bullets: [
      "Upload bank statements and receipts",
      "Reconcile, categorise, and review VAT",
      "See a simpler owner-facing workspace",
    ],
  },
  {
    id: "accountant",
    title: "Accountant account",
    subtitle: "For accountants and bookkeepers reviewing client data.",
    bullets: [
      "Get the full accounting and review view",
      "Access advanced templates and posting tools",
      "Work across client-style finance workflows",
    ],
  },
];

const businessTypeOptions: Array<{
  id: BusinessType;
  title: string;
  subtitle: string;
  icon: typeof Calculator;
}> = [
  {
    id: "sole_trader",
    title: "Sole trader",
    subtitle: "Simpler profit, VAT, and tax-focused experience.",
    icon: Calculator,
  },
  {
    id: "general_small_business",
    title: "Business / company",
    subtitle: "Broader bookkeeping and reporting workflow.",
    icon: BriefcaseBusiness,
  },
];

export function SignUpExperience() {
  const [accountType, setAccountType] = useState<UserAccountType>("business_user");
  const [businessType, setBusinessType] = useState<BusinessType>("sole_trader");

  useEffect(() => {
    if (accountType === "accountant") {
      setBusinessType("general_small_business");
    }
  }, [accountType]);

  useEffect(() => {
    writeCookie(PENDING_ACCOUNT_TYPE_COOKIE, accountType);
    writeCookie(PENDING_BUSINESS_TYPE_COOKIE, businessType);
  }, [accountType, businessType]);

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <Card className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              Choose your setup
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Create the right Zentra experience from day one.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted-foreground)]">
            Pick whether you&apos;re using Zentra for your own business or as an accountant.
              We&apos;ll shape the workspace around that choice. Your account type is permanent and
              can&apos;t be changed later.
            </p>
          </div>

          <div className="space-y-3">
            {accountOptions.map((option) => {
              const selected = accountType === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAccountType(option.id)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition",
                    selected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-sm"
                      : "border-[var(--color-border)] bg-white hover:border-[var(--color-accent)]/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                        {option.title}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                        {option.subtitle}
                      </p>
                    </div>
                    {selected && <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--color-accent)]" />}
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm text-[var(--color-muted-foreground)]">
                    {option.bullets.map((bullet) => (
                      <li key={bullet}>• {bullet}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                Business type
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {businessTypeOptions.map((option) => {
                const selected = businessType === option.id;
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setBusinessType(option.id)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition",
                      selected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-sm"
                        : "border-[var(--color-border)] bg-white hover:border-[var(--color-accent)]/40",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--color-accent)] shadow-sm">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--color-foreground)]">{option.title}</p>
                        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                          {option.subtitle}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {accountType === "accountant" && (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Accountant accounts keep the full finance view regardless of the starting business
                type. This selection mainly shapes the first private workspace that gets created.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card className="flex items-center justify-center">
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/dashboard" />
      </Card>
    </div>
  );
}
