"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Building2, Check, UserIcon, ShieldCheck, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { setActiveWorkspace } from "@/lib/actions/workspace-actions";
import { JoinWorkspaceDialog } from "@/components/invitations/join-workspace-dialog";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: {
  workspaces: WorkspaceInfo[];
  currentWorkspaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const router = useRouter();
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

  const handleSwitch = async (id: string) => {
    if (id === currentWorkspaceId) return;
    setOpen(false);
    await setActiveWorkspace(id);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="group flex w-full flex-col gap-1 rounded-3xl border border-[var(--color-border)] bg-white p-4 transition-all hover:bg-[var(--color-panel)] hover:shadow-sm"
      >
        <div className="flex w-full items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
            Active Workspace
          </div>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-[var(--color-muted-foreground)] transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--color-foreground)] text-white">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-foreground)] line-clamp-1">
            {currentWorkspace?.name}
          </h1>
        </div>
        <div className="mt-1 flex items-center gap-1.5 px-0.5">
          {currentWorkspace?.role === "owner" ? (
            <div className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
               <ShieldCheck className="h-2.5 w-2.5" />
               OWNER
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
               <UserIcon className="h-2.5 w-2.5" />
               {currentWorkspace?.role}
            </div>
          )}
        </div>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-2 w-full origin-top animate-in fade-in zoom-in-95 duration-200">
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-1.5 shadow-2xl ring-1 ring-black/5">
              <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] border-bottom border-[var(--color-border)] mb-1">
                Your Workspaces
              </div>
              <div className="space-y-0.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitch(ws.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-all",
                      ws.id === currentWorkspaceId
                        ? "bg-[var(--color-panel)]"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        ws.id === currentWorkspaceId ? "bg-[var(--color-foreground)] text-white" : "bg-slate-100 text-slate-500"
                      )}>
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-[var(--color-foreground)] line-clamp-1 leading-tight">
                          {ws.name}
                        </span>
                        <span className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider font-medium leading-none">
                          {ws.role}
                        </span>
                      </div>
                    </div>
                    {ws.id === currentWorkspaceId && (
                      <Check className="h-4 w-4 text-[var(--color-foreground)]" />
                    )}
                  </button>
                ))}
              </div>
              
              <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)]">
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-[var(--color-muted-foreground)] transition hover:bg-slate-50 hover:text-[var(--color-foreground)]"
                  onClick={() => {
                    setOpen(false);
                    router.push("/workspaces/new");
                  }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 border border-dashed border-slate-300">
                    <Plus className="h-4 w-4" />
                  </div>
                  New Workspace
                </button>

                <button
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-[var(--color-muted-foreground)] transition hover:bg-slate-50 hover:text-[var(--color-foreground)]"
                  onClick={() => {
                    setOpen(false);
                    setJoinDialogOpen(true);
                  }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50/50 border border-dashed border-indigo-200 text-indigo-500">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  Join Workspace
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <JoinWorkspaceDialog 
        open={joinDialogOpen} 
        onOpenChange={setJoinDialogOpen} 
      />
    </div>
  );
}
