"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import type { Workspace } from "@/lib/domain/types";

export function VatRegistrationCard({
  initialVatRegistered,
  initialBusinessType,
}: {
  initialVatRegistered: boolean;
  initialBusinessType: Workspace["businessType"];
}) {
  const [vatRegistered, setVatRegistered] = useState(initialVatRegistered);
  const [businessType, setBusinessType] = useState(initialBusinessType);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function save(patch: Partial<Pick<Workspace, "vatRegistered" | "businessType">>) {
    if (patch.vatRegistered !== undefined) setVatRegistered(patch.vatRegistered);
    if (patch.businessType !== undefined) setBusinessType(patch.businessType);
    setStatus("idle");

    startTransition(async () => {
      try {
        const response = await fetch("/api/settings/workspace", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });

        setStatus(response.ok ? "saved" : "error");
        if (response.ok) {
          setTimeout(() => setStatus("idle"), 2500);
        }
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Tax profile</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Set the business type and VAT registration status ClearMatch should use when building
          bookkeeping reports and tax estimates.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl bg-[var(--color-panel)] p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">Business type</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Sole trader mode enables an owner-level small-business tax estimate. General small
              business mode keeps the page focused on profit and VAT summaries only.
            </p>
          </div>
          <select
            value={businessType}
            onChange={(event) =>
              save({ businessType: event.target.value as Workspace["businessType"] })
            }
            disabled={isPending}
            className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="sole_trader">Sole trader / self-employed</option>
            <option value="general_small_business">General small business</option>
          </select>
        </div>

        <div className="flex flex-col gap-4 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            {vatRegistered ? "VAT registered" : "Not VAT registered"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {vatRegistered
              ? "Transactions can be split into net and VAT, and the VAT summary report is active."
              : "Transactions are treated as gross-only for bookkeeping outputs and VAT complexity is reduced."}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={vatRegistered}
          onClick={() => save({ vatRegistered: !vatRegistered })}
          disabled={isPending}
          className={`relative inline-flex h-11 w-24 items-center rounded-full border transition ${
            vatRegistered
              ? "border-emerald-300 bg-emerald-100"
              : "border-[var(--color-border)] bg-white"
          } ${isPending ? "opacity-70" : ""}`}
        >
          <span
            className={`absolute left-1 top-1 inline-flex h-8 w-12 items-center justify-center rounded-full text-xs font-semibold transition ${
              vatRegistered
                ? "translate-x-[44px] bg-emerald-600 text-white"
                : "translate-x-0 bg-[var(--color-foreground)] text-white"
            }`}
          >
            {vatRegistered ? "On" : "Off"}
          </span>
        </button>
      </div>
      </div>

      {status === "saved" ? (
        <p className="text-sm text-emerald-700">Tax profile saved.</p>
      ) : null}
      {status === "error" ? (
        <p className="text-sm text-[var(--color-danger)]">
          We couldn&apos;t save the VAT registration setting. Please try again.
        </p>
      ) : null}
    </Card>
  );
}
