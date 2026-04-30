import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Get Started" };

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-[var(--color-foreground)]">Welcome!</h1>
          <p className="mt-2 text-[var(--color-muted-foreground)]">Let&apos;s get your workspace set up in just a few steps.</p>
        </div>
        <div className="rounded-3xl border border-[var(--color-border)] bg-white p-8 shadow-sm">
          <OnboardingWizard />
        </div>
      </div>
    </div>
  );
}
