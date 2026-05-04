"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Send, ShieldCheck } from "lucide-react";

interface ReviewSubmission {
  id: string;
  status: string;
  period: string | null;
  note: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  submittedByName: string;
  reviewedByName: string | null;
}

interface Props {
  period: string;
  readinessPercent: number;
  reviewIssueCount: number;
  missingReceiptCount: number;
  canMarkReviewed?: boolean;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusLabel(status?: string) {
  switch (status) {
    case "reviewed":
      return "Accountant reviewed";
    case "changes_requested":
      return "Changes requested";
    case "in_review":
      return "With accountant";
    case "submitted":
      return "Submitted for review";
    default:
      return "Not submitted yet";
  }
}

export function SubmitReviewCard({
  period,
  readinessPercent,
  reviewIssueCount,
  missingReceiptCount,
  canMarkReviewed = false,
}: Props) {
  const [latest, setLatest] = useState<ReviewSubmission | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    fetch("/api/review-submissions", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data?.latest) setLatest(data.latest);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  function submitForReview() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/review-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          note: message,
          readiness: {
            readinessPercent,
            reviewIssueCount,
            missingReceiptCount,
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not submit records for review.");
        return;
      }
      setLatest(data.submission);
      setMessage("");
    });
  }

  function markReviewed() {
    if (!latest) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/review-submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: latest.id, status: "reviewed" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not mark records reviewed.");
        return;
      }
      setLatest(data.submission);
    });
  }

  const reviewed = latest?.status === "reviewed";

  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="grid gap-5 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            Accountant handoff
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-[-0.04em] text-[var(--color-foreground)]">
              Prepare the records, then send them for review.
            </h2>
            {latest && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
                  reviewed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {reviewed ? <ShieldCheck className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {statusLabel(latest.status)}
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">
            Zentra helps you clean the admin. The final tax/accounting review should still
            be handled by you or your accountant before anything is filed.
          </p>
          {latest && (
            <p className="mt-2 text-xs font-medium text-[var(--color-muted-foreground)]">
              Last submitted {formatDate(latest.submittedAt)} by {latest.submittedByName}
              {latest.reviewedAt ? ` · reviewed ${formatDate(latest.reviewedAt)}` : ""}.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--color-panel)] p-4">
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            Optional note for accountant
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15"
            placeholder="Example: I have uploaded all receipts I can find. Please check the Amazon items."
          />
          {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
          <button
            type="button"
            onClick={submitForReview}
            disabled={isPending}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {isPending ? "Submitting..." : latest ? "Submit updated records" : "Submit to accountant"}
          </button>
          {canMarkReviewed && latest && latest.status !== "reviewed" && (
            <button
              type="button"
              onClick={markReviewed}
              disabled={isPending}
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              Mark accountant reviewed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
