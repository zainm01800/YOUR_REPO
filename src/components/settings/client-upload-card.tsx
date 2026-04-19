"use client";

import { useState } from "react";

interface ClientUploadCardProps {
  uploadUrl: string | null;
}

export function ClientUploadCard({ uploadUrl }: ClientUploadCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!uploadUrl) return;
    await navigator.clipboard.writeText(uploadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-premium space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
          Client upload link
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Share this link with clients so they can submit bank statements
          directly. No login required. The link is protected by a secret token.
        </p>
      </div>

      {uploadUrl ? (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2.5">
            <p className="truncate font-mono text-sm text-[var(--color-foreground)]">
              {uploadUrl}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-panel)]"
          >
            {copied ? (
              <>
                <svg
                  className="h-4 w-4 text-[var(--color-accent)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                  />
                </svg>
                Copy link
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
          No upload link configured. Set the{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
            UPLOAD_TOKEN
          </code>{" "}
          and{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
            APP_URL
          </code>{" "}
          environment variables to enable client uploads.
        </div>
      )}
    </div>
  );
}
