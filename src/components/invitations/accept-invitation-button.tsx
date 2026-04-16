"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { acceptInvitationAction } from "@/app/actions/invitation-actions";
import { useRouter } from "next/navigation";

export function AcceptInvitationButton({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await acceptInvitationAction(token);
        if (result.success) {
          router.push("/dashboard");
        } else {
          setError(result.error || "Failed to accept invitation.");
        }
      } catch (err) {
        setError("An unexpected error occurred. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <Button
        onClick={handleAccept}
        disabled={isPending}
        className="w-full rounded-2xl py-6 text-base font-semibold gap-2 shadow-sm"
      >
        {isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Accepting…
          </>
        ) : (
          <>
            Accept Invitation
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </Button>
    </div>
  );
}
