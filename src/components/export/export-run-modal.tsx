"use client";

import { useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, ExternalLink, Settings2, X } from "lucide-react";
import type { ReviewRow } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { ExportDownloadPanel } from "@/components/export/export-download-panel";

export function ExportRunModal({
  runId,
  rows,
  isOpen,
  onClose,
}: {
  runId: string;
  rows: ReviewRow[];
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  const exportableRows = rows.filter((row) => !row.excludedFromExport);
  const missingGl = exportableRows.filter((row) => !row.glCode).length;
  const missingVat = exportableRows.filter(
    (row) => row.vatCode === undefined || row.vatCode === null || row.vatCode === "",
  ).length;
  const unmatched = exportableRows.filter((row) => row.matchStatus === "unmatched").length;
  const unapproved = exportableRows.filter((row) => !row.approved).length;
  const hasWarnings = missingGl > 0 || missingVat > 0 || unmatched > 0;
  const allGood = !hasWarnings && unapproved === 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(14,27,21,0.42)] px-4 py-6 backdrop-blur-[2px] md:px-6"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col gap-5 rounded-[32px] border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-[0_28px_80px_rgba(14,27,21,0.24)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              Export
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
              Download run
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl hover:bg-[var(--color-panel)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Readiness card */}
        <Card
          className={`border-2 ${
            allGood
              ? "border-emerald-200 bg-emerald-50"
              : "border-[var(--color-danger-border)] bg-[var(--color-danger-soft)]"
          }`}
        >
          <div className="flex items-start gap-3">
            {allGood ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-danger)]" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${allGood ? "text-emerald-800" : "text-[var(--color-danger)]"}`}>
                {allGood ? "Ready to export" : "Issues found"}
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                {exportableRows.length} of {rows.length} rows included.
                {unapproved > 0 && ` ${unapproved} unapproved.`}
              </p>
              {hasWarnings && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-[var(--color-danger)]">
                  {missingGl > 0 && (
                    <span className="rounded bg-white px-2 py-0.5 font-medium">
                      {missingGl} missing GL
                    </span>
                  )}
                  {missingVat > 0 && (
                    <span className="rounded bg-white px-2 py-0.5 font-medium">
                      {missingVat} missing VAT
                    </span>
                  )}
                  {unmatched > 0 && (
                    <span className="rounded bg-white px-2 py-0.5 font-medium">
                      {unmatched} unmatched
                    </span>
                  )}
                  <Link
                    href={`/runs/${runId}/exceptions`}
                    className="ml-auto font-semibold underline underline-offset-2"
                    onClick={onClose}
                  >
                    View exceptions →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Download buttons */}
        <div>
          <ExportDownloadPanel runId={runId} compact />
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
          <Link
            href={`/runs/${runId}/export`}
            className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            onClick={onClose}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Full export page
          </Link>
          <div className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
            <Settings2 className="h-3.5 w-3.5" />
            Edit columns in the
            <button
              type="button"
              className="font-semibold text-[var(--color-foreground)] underline underline-offset-2"
              onClick={onClose}
            >
              Template tab
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
