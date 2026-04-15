"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createWorkspace } from "@/lib/actions/create-workspace";
import { Button } from "@/components/ui/button";

type State = { error?: string } | null;

export function NewWorkspaceForm() {
  const [state, action, pending] = useActionState(createWorkspace, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-[var(--color-foreground)]">
          Workspace name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          placeholder="e.g. Acme Ltd, My Freelance Business"
          className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          autoFocus
        />
        <p className="text-xs text-[var(--color-muted-foreground)]">
          This can be changed later in workspace settings.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={pending} className="gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Creating…" : "Create workspace"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
