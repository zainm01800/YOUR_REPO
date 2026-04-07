"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReviewRow } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReviewActions({ runId, row }: { runId: string; row: ReviewRow }) {
  const [glCode, setGlCode] = useState(row.glCode || "");
  const [vatCode, setVatCode] = useState(row.vatCode || "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function submit(actionType: string, value?: string) {
    await fetch(`/api/runs/${runId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId,
        rowId: row.id,
        actionType,
        value,
      }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input value={glCode} onChange={(event) => setGlCode(event.target.value)} />
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await submit("override_gl_code", glCode);
            })
          }
        >
          Save GL code
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input value={vatCode} onChange={(event) => setVatCode(event.target.value)} />
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await submit("override_vat_code", vatCode);
            })
          }
        >
          Save VAT code
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await submit("approve");
            })
          }
        >
          Approve row
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await submit("no_receipt_required");
            })
          }
        >
          Mark no receipt required
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await submit("exclude_from_export");
            })
          }
        >
          Exclude from export
        </Button>
      </div>
    </div>
  );
}

