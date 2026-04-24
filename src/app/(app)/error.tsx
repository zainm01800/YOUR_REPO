"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-danger-soft)]">
        <AlertTriangle className="h-7 w-7 text-[var(--color-danger)]" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-sm text-sm text-[var(--color-muted-foreground)]">
        An unexpected error occurred loading this page. Try refreshing or click below to retry.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-[var(--color-muted-foreground)] opacity-60">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
