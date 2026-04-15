"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Pencil, X } from "lucide-react";
import type { Workspace } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function ToleranceEditor({ workspace }: { workspace: Workspace }) {
  const [editing, setEditing] = useState(false);
  const [amountTolerance, setAmountTolerance] = useState(String(workspace.amountTolerance));
  const [dateToleranceDays, setDateToleranceDays] = useState(String(workspace.dateToleranceDays));
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleSave() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/settings/workspace", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountTolerance: parseFloat(amountTolerance) || 0,
            dateToleranceDays: parseInt(dateToleranceDays) || 0,
          }),
        });
        if (response.ok) {
          setSaved(true);
          setEditing(false);
          toast({ variant: "success", title: "Tolerance settings saved" });
          setTimeout(() => setSaved(false), 3000);
        } else {
          toast({ variant: "error", title: "Save failed", description: "Could not save tolerance settings." });
        }
      } catch {
        toast({ variant: "error", title: "Save failed", description: "Could not save tolerance settings." });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tolerance</h2>
        {!editing ? (
          <Button variant="ghost" className="gap-2 text-sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        ) : (
          <Button variant="ghost" className="gap-2 text-sm text-[var(--color-muted-foreground)]" onClick={() => setEditing(false)}>
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <label className="space-y-2">
            <span className="text-sm font-medium">Amount tolerance</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amountTolerance}
              onChange={(e) => setAmountTolerance(e.target.value)}
            />
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Maximum allowed difference between transaction and document amounts.
            </span>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Date tolerance (days)</span>
            <Input
              type="number"
              step="1"
              min="0"
              value={dateToleranceDays}
              onChange={(e) => setDateToleranceDays(e.target.value)}
            />
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Maximum allowed difference between transaction date and document date.
            </span>
          </label>
          <div className="rounded-2xl bg-[var(--color-panel)] p-4 text-sm text-[var(--color-muted-foreground)]">
            Default currency: <span className="font-semibold text-[var(--color-foreground)]">{workspace.defaultCurrency}</span>
            &nbsp;·&nbsp; Country: <span className="font-semibold text-[var(--color-foreground)]">{workspace.countryProfile}</span>
          </div>
          <Button onClick={handleSave} disabled={isPending} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {isPending ? "Saving…" : "Save tolerance settings"}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm leading-8 text-[var(--color-muted-foreground)]">
          Amount tolerance: <span className="font-semibold text-[var(--color-foreground)]">{workspace.amountTolerance.toFixed(2)}</span>
          <br />
          Date tolerance: <span className="font-semibold text-[var(--color-foreground)]">{workspace.dateToleranceDays} days</span>
          <br />
          Default currency: <span className="font-semibold text-[var(--color-foreground)]">{workspace.defaultCurrency}</span>
          <br />
          Country profile: <span className="font-semibold text-[var(--color-foreground)]">{workspace.countryProfile}</span>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          Tolerance settings saved.
        </div>
      )}
    </div>
  );
}
