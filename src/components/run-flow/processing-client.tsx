"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STEPS = [
  "Parse transaction file and detect columns",
  "Expand ZIP uploads and register supported documents",
  "Extract supplier, date, VAT, and totals from each document",
  "Score document-to-transaction matches",
  "Build review rows and surface exceptions",
];

const TERMINAL_STATUSES = new Set([
  "review_required",
  "completed",
  "failed",
]);

export function ProcessingClient({ runId }: { runId: string }) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // progress = fraction of steps completed (0–1)
  const progress =
    isProcessing
      ? completedSteps.length / STEPS.length
      : 0;

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      clearTimeout(animFrameRef.current);
      animFrameRef.current = null;
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  async function handleProcess() {
    setIsProcessing(true);
    setError(null);
    setCompletedSteps([]);
    setCurrentStep(0);

    try {
      const postRes = await fetch(`/api/runs/${runId}/process`, {
        method: "POST",
      });

      if (!postRes.ok) {
        const payload = (await postRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Processing failed.");
      }

      // Animate steps for 500 ms then redirect
      let step = 0;
      const animateSteps = () => {
        if (step < STEPS.length) {
          setCompletedSteps((prev) => [...prev, step]);
          setCurrentStep(step + 1 < STEPS.length ? step + 1 : -1);
          step++;
          animFrameRef.current = setTimeout(animateSteps, 100);
        } else {
          // All steps animated — start polling
          pollIntervalRef.current = setInterval(async () => {
            try {
              const getRes = await fetch(`/api/runs/${runId}`, {
                method: "GET",
              });

              if (!getRes.ok) return;

              const data = (await getRes.json()) as { status?: string } | null;
              const status = data?.status;

              if (status && TERMINAL_STATUSES.has(status)) {
                stopPolling();
                router.push(`/runs/${runId}/review`);
              }
            } catch {
              // swallow poll errors — keep retrying
            }
          }, 2000);
        }
      };

      // Wait 500 ms total before starting redirect — animate steps in that window
      animFrameRef.current = setTimeout(animateSteps, 0);

      // Safety: after 10 s of polling give up and redirect anyway
      setTimeout(() => {
        stopPolling();
        router.push(`/runs/${runId}/review`);
      }, 10_000);
    } catch (err) {
      setIsProcessing(false);
      setCurrentStep(-1);
      setCompletedSteps([]);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
      {/* Steps */}
      <Card className="space-y-5">
        {STEPS.map((step, index) => {
          const done = completedSteps.includes(index);
          const active = isProcessing && currentStep === index;

          return (
            <div
              key={step}
              className="flex items-start gap-5 rounded-2xl bg-[var(--color-panel)] p-5"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-sm transition-colors ${
                  done
                    ? "bg-emerald-100 text-emerald-700"
                    : active
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-white text-[var(--color-accent)]"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : active ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  index + 1
                )}
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-foreground)]">{step}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  Designed so the worker can be swapped from mock/demo mode to a real OCR
                  provider later.
                </p>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Control card */}
      <Card className="space-y-4">
        <h2 className="text-xl font-semibold">Start processing</h2>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          For the seeded demo run, processing has already completed. For new runs, this button
          triggers the background-safe processing service and then sends the user to review.
        </p>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Progress bar */}
        {isProcessing && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-panel)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            disabled={isProcessing}
            onClick={handleProcess}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              "Process run"
            )}
          </Button>

          {!isProcessing && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
