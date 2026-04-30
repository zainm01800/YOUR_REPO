"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Building2, Receipt, Users, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

type BusinessType = "sole_trader" | "general_small_business";

interface WizardState {
  businessType: BusinessType | null;
  vatRegistered: boolean | null;
  hasAccountant: boolean | null;
}

const TOTAL_STEPS = 3;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              i < step
                ? "w-8 bg-[var(--color-accent)]"
                : i === step
                ? "w-8 bg-[var(--color-accent)]/40"
                : "w-8 bg-[var(--color-border)]"
            }`}
          />
        </div>
      ))}
      <span className="text-xs text-[var(--color-muted-foreground)] ml-1">
        Step {Math.min(step + 1, TOTAL_STEPS)} of {TOTAL_STEPS}
      </span>
    </div>
  );
}

function Step1({ state, onChange }: { state: WizardState; onChange: (v: BusinessType) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">What type of business are you?</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">This helps us set up the right features and tax settings for you.</p>
      </div>
      <div className="grid gap-4">
        <button
          type="button"
          onClick={() => onChange("sole_trader")}
          className={`flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition hover:border-[var(--color-accent)] ${
            state.businessType === "sole_trader"
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
              : "border-[var(--color-border)] bg-white"
          }`}
        >
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)]">
            <Users className="h-5 w-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--color-foreground)]">Sole Trader</p>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">Self-employed individual — freelancers, contractors, tradespeople</p>
          </div>
          {state.businessType === "sole_trader" && (
            <CheckCircle className="ml-auto h-5 w-5 shrink-0 text-[var(--color-accent)]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onChange("general_small_business")}
          className={`flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition hover:border-[var(--color-accent)] ${
            state.businessType === "general_small_business"
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
              : "border-[var(--color-border)] bg-white"
          }`}
        >
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)]">
            <Building2 className="h-5 w-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--color-foreground)]">General Small Business</p>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">Limited company, partnership, or small business with employees</p>
          </div>
          {state.businessType === "general_small_business" && (
            <CheckCircle className="ml-auto h-5 w-5 shrink-0 text-[var(--color-accent)]" />
          )}
        </button>
      </div>
    </div>
  );
}

function Step2({ state, onChange }: { state: WizardState; onChange: (v: boolean) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">Are you VAT registered?</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          If your taxable turnover exceeds £90,000 you must register. Being VAT registered affects how we split your transaction amounts.
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-accent-soft)]/40 px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
        <Receipt className="mb-1 h-4 w-4 text-[var(--color-accent)]" />
        <strong className="text-[var(--color-foreground)]">What this means:</strong> VAT-registered businesses charge VAT on sales and can reclaim VAT on purchases.
        We&apos;ll automatically calculate net/VAT splits on your transactions.
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-6 transition hover:border-[var(--color-accent)] ${
            state.vatRegistered === true
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
              : "border-[var(--color-border)] bg-white"
          }`}
        >
          <span className="text-2xl">✓</span>
          <span className="font-semibold text-[var(--color-foreground)]">Yes</span>
          <span className="text-xs text-[var(--color-muted-foreground)]">I am VAT registered</span>
          {state.vatRegistered === true && <CheckCircle className="h-4 w-4 text-[var(--color-accent)]" />}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-6 transition hover:border-[var(--color-accent)] ${
            state.vatRegistered === false
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
              : "border-[var(--color-border)] bg-white"
          }`}
        >
          <span className="text-2xl">✗</span>
          <span className="font-semibold text-[var(--color-foreground)]">No</span>
          <span className="text-xs text-[var(--color-muted-foreground)]">Not VAT registered</span>
          {state.vatRegistered === false && <CheckCircle className="h-4 w-4 text-[var(--color-accent)]" />}
        </button>
      </div>
    </div>
  );
}

function Step3({ state, onChange }: { state: WizardState; onChange: (v: boolean) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">Do you have an accountant?</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">You can invite your accountant to collaborate on your workspace — they&apos;ll have full read access and can review your bookkeeping.</p>
      </div>
      <div className="grid gap-4">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition hover:border-[var(--color-accent)] ${
            state.hasAccountant === true
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
              : "border-[var(--color-border)] bg-white"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)]">
            <Users className="h-5 w-5 text-[var(--color-accent)]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--color-foreground)]">Yes — invite them now</p>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">Send an invitation so they can start reviewing your books</p>
          </div>
          {state.hasAccountant === true && <CheckCircle className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />}
        </button>

        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition hover:border-[var(--color-accent)] ${
            state.hasAccountant === false
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
              : "border-[var(--color-border)] bg-white"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-border)]">
            <Users className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--color-foreground)]">No — that&apos;s fine</p>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">You can invite someone later from Settings</p>
          </div>
          {state.hasAccountant === false && <CheckCircle className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />}
        </button>
      </div>
      {state.hasAccountant === true && (
        <div className="rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-foreground)]">
          Great! After completing setup you&apos;ll be taken to the dashboard — head to <strong>Settings → Team</strong> to send the invite.
        </div>
      )}
    </div>
  );
}

function SuccessScreen() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-foreground)]">You&apos;re all set!</h2>
        <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm">
          Your workspace is configured. Here are some great first steps to get started.
        </p>
      </div>

      <div className="grid gap-3">
        <Link
          href="/bank-statements/import"
          className="flex items-center gap-4 rounded-2xl border-2 border-[var(--color-border)] bg-white p-4 text-left hover:border-[var(--color-accent)] transition"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <Receipt className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--color-foreground)] text-sm">Import bank statement</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Upload a CSV or OFX file from your bank</p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        </Link>

        <Link
          href="/invoices/new"
          className="flex items-center gap-4 rounded-2xl border-2 border-[var(--color-border)] bg-white p-4 text-left hover:border-[var(--color-accent)] transition"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50">
            <Building2 className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--color-foreground)] text-sm">Create first invoice</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Send a professional invoice to a client</p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        </Link>

        <Link
          href="/settings?tab=category-rules"
          className="flex items-center gap-4 rounded-2xl border-2 border-[var(--color-border)] bg-white p-4 text-left hover:border-[var(--color-accent)] transition"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50">
            <CheckCircle className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--color-foreground)] text-sm">Set up categories</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Customise how transactions are classified</p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        </Link>
      </div>

      <Link
        href="/dashboard"
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] py-3 font-semibold text-white hover:opacity-90 transition"
      >
        Go to Dashboard
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [state, setState] = useState<WizardState>({
    businessType: null,
    vatRegistered: null,
    hasAccountant: null,
  });

  const canProceed =
    (step === 0 && state.businessType !== null) ||
    (step === 1 && state.vatRegistered !== null) ||
    (step === 2 && state.hasAccountant !== null);

  async function handleFinish() {
    setSaving(true);
    try {
      await fetch("/api/settings/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType: state.businessType,
          vatRegistered: state.vatRegistered ?? false,
        }),
      });
      setDone(true);
    } catch {
      // Proceed anyway — settings can be changed later
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return <SuccessScreen />;
  }

  return (
    <div className="space-y-6">
      <ProgressBar step={step} />

      {step === 0 && (
        <Step1
          state={state}
          onChange={v => setState(s => ({ ...s, businessType: v }))}
        />
      )}
      {step === 1 && (
        <Step2
          state={state}
          onChange={v => setState(s => ({ ...s, vatRegistered: v }))}
        />
      )}
      {step === 2 && (
        <Step3
          state={state}
          onChange={v => setState(s => ({ ...s, hasAccountant: v }))}
        />
      )}

      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1.5 rounded-2xl border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/30 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        <button
          type="button"
          disabled={!canProceed || saving}
          onClick={() => {
            if (step < TOTAL_STEPS - 1) {
              setStep(s => s + 1);
            } else {
              handleFinish();
            }
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition"
        >
          {saving ? "Saving…" : step < TOTAL_STEPS - 1 ? (
            <>Continue <ArrowRight className="h-4 w-4" /></>
          ) : (
            <>Finish setup <CheckCircle className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
