"use client";

import { useState } from "react";
import { UserPlus, Mail, Shield, Trash2, X, Check, Loader2, User, Key, Globe } from "lucide-react";
import { WorkspaceMember, Invitation } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { inviteUser } from "@/lib/actions/workspace-actions";
import { cn } from "@/lib/utils";

interface MemberManagerProps {
  memberships: WorkspaceMember[];
  invitations: Invitation[];
  workspaceId: string;
}

export function MemberManager({ memberships, invitations, workspaceId }: MemberManagerProps) {
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("admin");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    setLoading(true);
    try {
      await inviteUser(inviteEmail, inviteRole);
      setIsInviting(false);
      setInviteEmail("");
      router.refresh();
      // In a real app, show a toast here
      alert(`Invitation sent to ${inviteEmail}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team & Access</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Manage who can access this workspace and their permission levels.
          </p>
        </div>
        <Button 
          onClick={() => setIsInviting(true)}
          className="rounded-xl flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {isInviting && (
        <Card className="border-2 border-[var(--color-accent)] animate-in slide-in-from-top-2 duration-200">
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4 text-[var(--color-accent)]" />
                Invite a new team member
              </h3>
              <button onClick={() => setIsInviting(false)} type="button">
                <X className="h-4 w-4 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]" />
              </button>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Email Address
                </label>
                <Input 
                  placeholder="colleague@company.com" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  type="email"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Access Level
                </label>
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                >
                  <option value="admin">Admin (Full Access)</option>
                  <option value="accountant">Accountant (Edit, No Settings)</option>
                  <option value="viewer">Viewer (Read Only)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" type="button" onClick={() => setIsInviting(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Send Invitation
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Members List */}
        <Card className="flex flex-col h-full">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--color-foreground)]" />
            <h3 className="font-semibold text-lg">Active Members</h3>
          </div>
          <div className="flex-1 space-y-4">
            {memberships.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-panel)] transition hover:bg-white hover:shadow-sm border border-transparent hover:border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[var(--color-border)] text-[var(--color-muted-foreground)] overflow-hidden">
                    {member.userName.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{member.userName}</span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">{member.userEmail}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={member.role === "owner" ? "info" : "neutral"}>
                    {member.role === "owner" ? <Key className="h-2.5 w-2.5 mr-1" /> : <User className="h-2.5 w-2.5 mr-1" />}
                    {member.role}
                  </Badge>
                  {member.role !== "owner" && (
                    <button className="text-[var(--color-muted-foreground)] hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Invitations List */}
        <Card className="flex flex-col h-full">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-[var(--color-foreground)]" />
            <h3 className="font-semibold text-lg">Pending Invitations</h3>
          </div>
          <div className="flex-1 space-y-4">
            {invitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 rounded-2xl bg-[var(--color-panel)] border-2 border-dashed border-[var(--color-border)]">
                <Globe className="h-8 w-8 text-[var(--color-muted-foreground)] mb-2 opacity-20" />
                <p className="text-sm text-[var(--color-muted-foreground)]">No pending invitations</p>
              </div>
            ) : (
              invitations.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-panel)] border border-transparent">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold truncate max-w-[180px]">{invite.email}</span>
                    <span className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider font-medium">
                      {invite.role} • Sent {new Date(invite.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="warning">
                      PENDING
                    </Badge>
                    <button className="text-[var(--color-muted-foreground)] hover:text-red-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
