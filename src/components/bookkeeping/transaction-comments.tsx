"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Send } from "lucide-react";

interface Comment {
  id: string;
  authorName: string;
  authorEmail: string;
  body: string;
  createdAt: string;
}

interface Props {
  transactionId: string;
}

export function TransactionComments({ transactionId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/transaction-comments?transactionId=${encodeURIComponent(transactionId)}`)
      .then(r => r.json())
      .then(d => { setComments(d.comments ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [transactionId]);

  async function submit() {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/transaction-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, body: newComment.trim() }),
      });
      const d = await res.json();
      if (d.comment) {
        setComments(prev => [...prev, d.comment]);
        setNewComment("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        <MessageSquare className="h-3.5 w-3.5" />
        Notes {comments.length > 0 && `(${comments.length})`}
      </div>

      {loading ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-[var(--color-muted-foreground)] italic">No notes yet. Add one to flag this for review.</p>
      ) : (
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[9px] font-bold text-[var(--color-accent)]">
                  {c.authorName.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-[var(--color-foreground)]">{c.authorName}</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
              <p className="text-xs text-[var(--color-foreground)] leading-5">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a note about this transaction…"
          rows={2}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }}}
          className="flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!newComment.trim() || submitting}
          className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-xl bg-[var(--color-accent)] text-white disabled:opacity-40 hover:opacity-90 transition"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-[10px] text-[var(--color-muted-foreground)]">Notes are visible to all workspace members.</p>
    </div>
  );
}
