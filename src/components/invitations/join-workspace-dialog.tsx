"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, UserPlus, ArrowRight } from "lucide-react";
import { resolveInvitationByCodeAction, acceptInvitationAction } from "@/app/actions/invitation-actions";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

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

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) reset();
      onOpenChange(v);
    }}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Join a Workspace</DialogTitle>
          <DialogDescription>
            Enter the invitation code provided by the workspace owner.
          </DialogDescription>
        </DialogHeader>

        {!invitation ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Invitation Code</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="INV-ABCD-12"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleResolve()}
                />
                <Button 
                  onClick={handleResolve} 
                  disabled={isResolving || !code.trim()}
                  className="shrink-0"
                >
                  {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                </Button>
              </div>
            </div>
            {error && <p className="text-xs font-medium text-red-500">{error}</p>}
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <Card className="p-4 bg-indigo-50/30 border-indigo-100 shadow-none">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-indigo-100">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{invitation.workspace.name}</p>
                  <p className="text-xs text-gray-500 capitalize">Joining as {invitation.role}</p>
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={handleAccept} disabled={isAccepting} className="w-full">
                {isAccepting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Confirm Join
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={() => setInvitation(null)} disabled={isAccepting}>
                Back
              </Button>
            </div>
            {error && <p className="text-xs font-medium text-red-500 text-center">{error}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
