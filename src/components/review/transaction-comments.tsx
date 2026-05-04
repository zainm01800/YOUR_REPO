"use client";

import { useEffect, useState, useTransition } from "react";
import { MessageSquarePlus } from "lucide-react";

interface Comment {
  id: string;
  body: string;
  requestType: string | null;
  createdAt: string;
  authorName: string;
}

const REQUEST_OPTIONS = [
  ["missing_receipt", "Missing receipt"],
  ["personal_check", "Personal/business check"],
  ["vat_check", "VAT check"],
  ["category_check", "Category check"],
  ["general", "General note"],
] as const;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function TransactionComments({
  transactionId,
}: {
  transactionId: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [requestType, setRequestType] = useState("general");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    setComments([]);
    fetch(`/api/transaction-comments?transactionId=${encodeURIComponent(transactionId)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive) setComments(data?.comments ?? []);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [transactionId]);

  function addComment() {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/transaction-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, body, requestType }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not add comment.");
        return;
      }
      setComments((current) => [...current, data.comment]);
      setBody("");
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-white p-4">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4 text-[var(--color-accent)]" />
        <p className="text-sm font-bold text-[var(--color-foreground)]">
          Accountant notes / requests
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {comments.length === 0 ? (
          <p className="rounded-xl bg-[var(--color-panel)] px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
            No notes yet. Use this to ask the client for a receipt, explanation, or VAT/category confirmation.
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-xl bg-[var(--color-panel)] px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[var(--color-foreground)]">
                  {comment.authorName}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  {comment.requestType?.replace(/_/g, " ") || "note"} · {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                {comment.body}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 grid gap-2">
        <select
          value={requestType}
          onChange={(event) => setRequestType(event.target.value)}
          className="h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-foreground)] outline-none"
        >
          {REQUEST_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={2}
          className="resize-none rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15"
          placeholder="Example: Please upload the receipt for this transaction."
        />
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        <button
          type="button"
          onClick={addComment}
          disabled={isPending || !body.trim()}
          className="h-9 rounded-xl bg-[var(--color-accent)] px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add note / request"}
        </button>
      </div>
    </div>
  );
}

