"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteWorkspace } from "@/lib/actions/workspace-actions";

interface Props {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
}

export function DeleteWorkspaceCard({ workspaceId, workspaceName, isOwner }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteWorkspace(workspaceId, confirmInput);
      if (!result.success) {
        setError(result.error);
        return;
      }
      // Workspace deleted — go to dashboard, layout will switch to next available workspace
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Card className="border-red-200 bg-red-50/40">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <h2 className="font-semibold text-red-700">Delete workspace</h2>
          <p className="text-sm text-red-600/80">
            Permanently deletes <span className="font-semibold">{workspaceName}</span> and all its
            data — runs, bank statements, documents, rules, and members. This cannot be undone.
          </p>
        </div>
      </div>

      {!isOwner ? (
        <p className="mt-4 rounded-xl bg-red-100/60 px-4 py-2.5 text-sm text-red-600">
          Only the workspace owner can delete it.
        </p>
      ) : !confirming ? (
        <div className="mt-5">
          <Button
            variant="secondary"
            onClick={() => setConfirming(true)}
            className="gap-2 border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete this workspace
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4 rounded-2xl border border-red-200 bg-white p-4">
          <p className="text-sm font-medium text-red-700">
            Type the workspace name to confirm:{" "}
            <span className="font-bold">{workspaceName}</span>
          </p>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => { setConfirmInput(e.target.value); setError(null); }}
            placeholder={workspaceName}
            className="h-10 w-full rounded-xl border border-red-200 bg-red-50/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            autoFocus
          />
          {error && (
            <p className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div className="flex gap-3">
            <Button
              onClick={handleDelete}
              disabled={pending || confirmInput.trim() !== workspaceName}
              className="gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {pending ? "Deleting…" : "Permanently delete"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setConfirming(false); setConfirmInput(""); setError(null); }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
