"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
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
  const { toast } = useToast();

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

        if (response.ok) {
          setStatus("saved");
          toast({ variant: "success", title: "Tax profile saved" });
          setTimeout(() => setStatus("idle"), 2500);
        } else {
          setStatus("error");
          toast({ variant: "error", title: "Save failed", description: "Could not save tax profile settings." });
        }
      } catch {
        setStatus("error");
        toast({ variant: "error", title: "Save failed", description: "Could not save tax profile settings." });
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
              Sole trader mode simplifies the app around profit, tax, and everyday bookkeeping,
              and hides the fuller balance-sheet-style statement screens. General small business
              mode keeps the broader accounting reporting experience available.
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

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              VAT registration
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {vatRegistered
                ? "Transactions are split into net and VAT, and the VAT summary report is active."
                : "Transactions are treated as gross-only for bookkeeping outputs."}
            </p>
          </div>
          <Switch
            checked={vatRegistered}
            onCheckedChange={(checked) => save({ vatRegistered: checked })}
            disabled={isPending}
          />
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
