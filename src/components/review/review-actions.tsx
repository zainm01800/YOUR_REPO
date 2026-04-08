"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import type { ReviewActionType, ReviewRow } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReviewActions({
  runId,
  row,
  onActionComplete,
}: {
  runId: string;
  row: ReviewRow;
  onActionComplete?: (actionType: ReviewActionType, value?: string) => void;
}) {
  const [glCode, setGlCode] = useState(row.glCode || "");
  const [vatCode, setVatCode] = useState(row.vatCode || "");
  const [glSuggesting, setGlSuggesting] = useState(false);
  const [glSuggestion, setGlSuggestion] = useState<{ glCode: string; reason: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function submit(actionType: string, value?: string) {
    await fetch(`/api/runs/${runId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId, rowId: row.id, actionType, value }),
    });
    onActionComplete?.(actionType as ReviewActionType, value);
    router.refresh();
  }

  async function handleSuggestGlCode() {
    setGlSuggesting(true);
    setGlSuggestion(null);
    try {
      const res = await fetch("/api/ai/gl-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: row.supplier,
          description: row.originalDescription,
        }),
      });
      const data = await res.json();
      if (data.glCode) {
        setGlSuggestion(data);
        setGlCode(data.glCode);
      }
    } catch {
      // silently fail
    } finally {
      setGlSuggesting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          GL Code
        </div>
        <div className="flex gap-2">
          <Input
            key={`gl_${row.id}_${row.glCode || ""}`}
            value={glCode}
            onChange={(event) => setGlCode(event.target.value)}
          />
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await submit("override_gl_code", glCode);
              })
            }
          >
            Save
          </Button>
        </div>
        <button
          type="button"
          disabled={glSuggesting}
          onClick={handleSuggestGlCode}
          className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:underline disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {glSuggesting ? "Suggesting…" : "Suggest GL code with AI"}
        </button>
        {glSuggestion && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Suggested <span className="font-semibold">{glSuggestion.glCode}</span> — {glSuggestion.reason}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          VAT Code
        </div>
        <div className="flex gap-2">
          <Input
            key={`vat_${row.id}_${row.vatCode || ""}`}
            value={vatCode}
            onChange={(event) => setVatCode(event.target.value)}
          />
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await submit("override_vat_code", vatCode);
              })
            }
          >
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => startTransition(async () => { await submit("approve"); })}
        >
          Approve row
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => startTransition(async () => { await submit("no_receipt_required"); })}
        >
          Mark no receipt required
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => startTransition(async () => { await submit("exclude_from_export"); })}
        >
          Exclude from export
        </Button>
      </div>
    </div>
  );
}
