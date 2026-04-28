"use client";

import { useState, useTransition } from "react";
import {
  UserPlus,
  Mail,
  Shield,
  Trash2,
  X,
  Check,
  Loader2,
  User,
  Key,
  Globe,
  Copy,
  ChevronDown,
} from "lucide-react";
import type { WorkspaceMember, Invitation, WorkspaceRole } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import {
  WORKSPACE_ACCESS_LEVELS,
  WORKSPACE_ROLE_DESCRIPTIONS,
  WORKSPACE_ROLE_LABELS,
  normalizeWorkspaceRole,
} from "@/lib/auth/workspace-role";
import {
  inviteUser,
  removeMember,
  revokeInvitation,
  updateMemberRole,
} from "@/lib/actions/workspace-actions";

interface MemberManagerProps {
  memberships: WorkspaceMember[];
  invitations: Invitation[];
  workspaceId: string;
}

function RoleBadge({ role }: { role: string }) {
  const normalizedRole = normalizeWorkspaceRole(role);
  const colors: Record<string, string> = {
    owner: "cm-status-accent",
    accountant_admin: "bg-purple-50 text-purple-700 border-purple-100",
    bookkeeper: "bg-emerald-50 text-emerald-700 border-emerald-100",
    tax_reviewer: "bg-amber-50 text-amber-700 border-amber-100",
    view_only: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${colors[normalizedRole] ?? colors.view_only}`}
    >
      {normalizedRole === "owner" ? <Key className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
      {WORKSPACE_ROLE_LABELS[normalizedRole]}
    </span>
  );
}

export function MemberManager({
  memberships: initialMemberships,
  invitations: initialInvitations,
}: MemberManagerProps) {
  const router = useRouter();
  const [memberships, setMemberships] = useState(initialMemberships);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("bookkeeper");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [invitePending, startInvite] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const { toast } = useToast();

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    startInvite(async () => {
      const result = await inviteUser(inviteEmail.trim(), inviteRole);
      if (!result.success) {
        setInviteError(result.error);
        toast({ variant: "error", title: "Invite failed", description: result.error });
        return;
      }
      setInviteCode(result.inviteCode);
      setInviteEmail("");
      toast({
        variant: "success",
        title: "Invitation created",
        description: "Share the invitation code with your team member.",
      });
      router.refresh();
    });
  }

  function copyCode() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCodeCopied(true);
      toast({ variant: "success", title: "Code copied to clipboard" });
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  async function handleRemoveConfirm(membershipId: string) {
    setConfirmRemoveId(null);
    setRemovingId(membershipId);
    setRowError(null);
    const result = await removeMember(membershipId);
    setRemovingId(null);
    if (!result.success) {
      setRowError(result.error);
      toast({ variant: "error", title: "Could not remove member", description: result.error });
    } else {
      setMemberships((prev) => prev.filter((m) => m.id !== membershipId));
      toast({ variant: "success", title: "Member removed" });
    }
  }

  async function handleRoleChange(membershipId: string, newRole: WorkspaceRole) {
    setEditingRoleId(membershipId);
    setRowError(null);
    const result = await updateMemberRole(membershipId, newRole);
    setEditingRoleId(null);
    if (!result.success) {
      setRowError(result.error);
      toast({ variant: "error", title: "Could not update access level", description: result.error });
    } else {
      setMemberships((prev) =>
        prev.map((m) => (m.id === membershipId ? { ...m, role: newRole } : m)),
      );
      toast({ variant: "success", title: "Access level updated" });
    }
  }

  async function handleRevokeConfirm(invitationId: string) {
    setConfirmRevokeId(null);
    setRevokingId(invitationId);
    setRowError(null);
    const result = await revokeInvitation(invitationId);
    setRevokingId(null);
    if (!result.success) {
      setRowError(result.error);
      toast({ variant: "error", title: "Could not revoke invitation", description: result.error });
    } else {
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      toast({ variant: "success", title: "Invitation revoked" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team &amp; Access</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            The business owner controls access. Invite accountants and assign the level that matches
            the work they should handle.
          </p>
        </div>
        {!isInviting && (
          <Button
            onClick={() => {
              setIsInviting(true);
              setInviteCode(null);
              setInviteError(null);
            }}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Invite member
          </Button>
        )}
      </div>

      {rowError && (
        <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{rowError}</div>
      )}

      {isInviting && (
        <Card className="animate-in slide-in-from-top-2 border-2 border-[var(--color-accent)] duration-200">
          {inviteCode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Invitation created
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsInviting(false);
                    setInviteCode(null);
                  }}
                >
                  <X className="h-4 w-4 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]" />
                </button>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Share this code with the person you are inviting. They can join the workspace from
                their own account.
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3">
                <span className="flex-1 truncate font-mono text-base font-bold tracking-widest text-[var(--color-foreground)]">
                  {inviteCode}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-slate-50"
                >
                  {codeCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {codeCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setInviteCode(null);
                    setInviteEmail("");
                  }}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite another
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsInviting(false);
                    setInviteCode(null);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Mail className="h-4 w-4 text-[var(--color-accent)]" />
                  Invite an accountant or collaborator
                </h3>
                <button type="button" onClick={() => setIsInviting(false)}>
                  <X className="h-4 w-4 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Access level
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(normalizeWorkspaceRole(e.target.value))}
                    className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  >
                    {WORKSPACE_ACCESS_LEVELS.filter((role) => role !== "owner").map((role) => (
                      <option key={role} value={role}>
                        {WORKSPACE_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {
                      WORKSPACE_ROLE_DESCRIPTIONS[
                        normalizeWorkspaceRole(inviteRole)
                      ]
                    }
                  </p>
                </div>
              </div>

              {inviteError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{inviteError}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={() => setIsInviting(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={invitePending} className="gap-2">
                  {invitePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {invitePending ? "Creating..." : "Send invitation"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--color-foreground)]" />
            <h3 className="text-lg font-semibold">Active members</h3>
            <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
              {memberships.length}
            </span>
          </div>
          <div className="space-y-2">
            {memberships.map((member) => {
              const normalizedRole = normalizeWorkspaceRole(member.role);
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-transparent bg-[var(--color-panel)] p-3 transition hover:border-[var(--color-border)] hover:bg-white hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-sm font-semibold text-[var(--color-muted-foreground)]">
                      {member.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight">{member.userName}</p>
                      <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                        {member.userEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {normalizedRole === "owner" ? (
                      <RoleBadge role="owner" />
                    ) : (
                      <div className="relative">
                        <select
                          value={normalizedRole}
                          disabled={editingRoleId === member.id}
                          onChange={(e) =>
                            handleRoleChange(member.id, normalizeWorkspaceRole(e.target.value))
                          }
                          className="h-7 appearance-none rounded-full border border-[var(--color-border)] bg-white pl-3 pr-7 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                        >
                          {WORKSPACE_ACCESS_LEVELS.filter((role) => role !== "owner").map((role) => (
                            <option key={role} value={role}>
                              {WORKSPACE_ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                      </div>
                    )}
                    {normalizedRole !== "owner" && (
                      <>
                        {confirmRemoveId === member.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveConfirm(member.id)}
                              className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-600"
                            >
                              Remove?
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveId(null)}
                              className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[10px] hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(member.id)}
                            disabled={removingId === member.id}
                            className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] transition hover:bg-red-50 hover:text-red-500"
                            title="Remove member"
                          >
                            {removingId === member.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-[var(--color-foreground)]" />
            <h3 className="text-lg font-semibold">Pending invitations</h3>
            <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
              {invitations.length}
            </span>
          </div>
          {invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-panel)] py-12 text-center">
              <Globe className="mb-2 h-8 w-8 text-[var(--color-muted-foreground)] opacity-20" />
              <p className="text-sm text-[var(--color-muted-foreground)]">No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-transparent bg-[var(--color-panel)] p-3 transition hover:border-[var(--color-border)] hover:bg-white hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{invite.email}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      {WORKSPACE_ROLE_LABELS[normalizeWorkspaceRole(invite.role)]} · Sent{" "}
                      {new Date(invite.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {invite.token && (
                      <button
                        type="button"
                        title="Copy invite code"
                        onClick={() => {
                          navigator.clipboard.writeText(invite.token as string).then(() => {
                            toast({ variant: "success", title: "Invite code copied" });
                          });
                        }}
                        className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] transition hover:bg-slate-100 hover:text-[var(--color-foreground)]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                      Pending
                    </span>
                    {confirmRevokeId === invite.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleRevokeConfirm(invite.id)}
                          className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-600"
                        >
                          Revoke?
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRevokeId(null)}
                          className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[10px] hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRevokeId(invite.id)}
                        disabled={revokingId === invite.id}
                        className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] transition hover:bg-red-50 hover:text-red-500"
                        title="Revoke invitation"
                      >
                        {revokingId === invite.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Access level guide
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5 text-sm">
          {WORKSPACE_ACCESS_LEVELS.map((role) => (
            <div key={role} className="flex flex-col gap-1.5">
              <RoleBadge role={role} />
              <p className="text-xs leading-snug text-[var(--color-muted-foreground)]">
                {WORKSPACE_ROLE_DESCRIPTIONS[role]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
