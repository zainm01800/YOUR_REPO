"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Building2, UserPlus, ArrowRight, X } from "lucide-react";
import { resolveInvitationByCodeAction, acceptInvitationAction } from "@/app/actions/invitation-actions";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function JoinWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [isResolving, startResolving] = useTransition();
  const [isAccepting, startAccepting] = useTransition();
  const router = useRouter();

  const handleResolve = () => {
    setError(null);
    if (!code.trim()) return;

    startResolving(async () => {
      const result = await resolveInvitationByCodeAction(code.trim());
      if (result.success) {
        setInvitation(result.invitation);
      } else {
        setError(result.error || "Could not find invitation.");
      }
    });
  };

  const handleAccept = () => {
    setError(null);
    startAccepting(async () => {
      const result = await acceptInvitationAction(code.trim());
      if (result.success) {
        onOpenChange(false);
        router.push("/dashboard");
      } else {
        setError(result.error || "Failed to join workspace.");
      }
    });
  };

  const reset = () => {
    setCode("");
    setError(null);
    setInvitation(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200" 
        onClick={() => {
          if (!isAccepting && !isResolving) onOpenChange(false);
        }}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-[425px] overflow-hidden rounded-3xl border border-white/20 bg-white p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200 ring-1 ring-black/5">
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Join a Workspace</h2>
          <p className="mt-1.5 text-sm text-gray-500">
            Enter the invitation code provided by the workspace owner.
          </p>
        </div>

        {!invitation ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-semibold tracking-tight text-gray-900">
                Invitation Code
              </label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="INV-ABCD-12"
                  value={code}
                  className="bg-gray-50/50"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleResolve()}
                />
                <Button 
                  onClick={handleResolve} 
                  disabled={isResolving || !code.trim()}
                  className="shrink-0 h-10 px-6 rounded-xl"
                >
                  {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                </Button>
              </div>
            </div>
            {error && <p className="text-xs font-semibold text-red-500 animate-in fade-in slide-in-from-top-1">{error}</p>}
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            <Card className="p-4 bg-indigo-50/40 border-indigo-100/50 shadow-none rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 tracking-tight">{invitation.workspace.name}</p>
                  <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Joining as {invitation.role}</p>
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-2.5">
              <Button onClick={handleAccept} disabled={isAccepting} className="w-full h-11 rounded-xl shadow-md shadow-indigo-100">
                {isAccepting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Confirm Join
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setInvitation(null)} 
                disabled={isAccepting}
                className="hover:bg-gray-50 text-gray-500 h-10"
              >
                Back
              </Button>
            </div>
            {error && <p className="text-xs font-semibold text-red-500 text-center animate-in fade-in slide-in-from-top-1">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
