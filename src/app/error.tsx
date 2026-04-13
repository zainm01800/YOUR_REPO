"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--color-danger-soft)]">
        <AlertTriangle className="h-7 w-7 text-[var(--color-danger)]" />
      </div>
      <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">Something went wrong</h2>
      <p className="mt-2 text-slate-600 max-w-md mx-auto">
        {error.message || "An unexpected error occurred while loading this page. Our team has been notified."}
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
