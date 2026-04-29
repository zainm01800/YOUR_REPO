"use client";

import { useState, useTransition } from "react";
import { X, UserPlus, Check, Copy, Loader2 } from "lucide-react";
import { inviteUser } from "@/lib/actions/workspace-actions";
import {
  WORKSPACE_ACCESS_LEVELS,
  WORKSPACE_ROLE_LABELS,
  normalizeWorkspaceRole,
} from "@/lib/auth/workspace-role";
import type { WorkspaceRole } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("bookkeeper");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function close() {
    if (isPending) return;
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setEmail("");
      setRole("bookkeeper");
      setError(null);
      setCode(null);
      setCopied(false);
    }, 200);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteUser(email.trim(), role);
      if (result.success) {
        setCode(result.inviteCode);
      } else {
        setError(result.error);
      }
    });
  }

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setEmail("");
    setRole("bookkeeper");
    setError(null);
    setCode(null);
    setCopied(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={close}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-2xl shadow-black/10 animate-in zoom-in-95 fade-in duration-150 ring-1 ring-black/5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[var(--accent-ink)]" />
            <span className="text-sm font-semibold text-[var(--ink)]">Invite member</span>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--bg)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {code ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                Invitation created — share this code.
              </div>

              {/* Code display */}
              <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3">
                <span className="flex-1 font-mono text-base font-bold tracking-widest text-[var(--ink)]">
                  {code}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                    copied
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-[var(--line)] bg-white text-[var(--ink-2)] hover:bg-[var(--bg)]"
                  )}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <p className="text-xs text-[var(--muted-2)]">
                The invitee signs in, clicks their workspace switcher, and enters this code under "Join workspace".
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={reset}
                  className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink-2)] transition hover:bg-[var(--bg)]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite another
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-2)]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="accountant@firm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-2)]">
                  Access level
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(normalizeWorkspaceRole(e.target.value))}
                  className="h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {WORKSPACE_ACCESS_LEVELS.filter((r) => r !== "owner").map((r) => (
                    <option key={r} value={r}>
                      {WORKSPACE_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {isPending ? "Creating…" : "Send invite"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
