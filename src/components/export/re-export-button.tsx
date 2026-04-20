"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { defaultExportLayout, getVisibleExportLayout } from "@/lib/export/layout";

interface ReExportButtonProps {
  runId: string;
  format: "csv" | "xlsx" | "zip";
  fileName: string;
}

/**
 * Re-export button shown in the export history table.
 * Regenerates the export from current run data (same format as the original).
 */
export function ReExportButton({ runId, format, fileName }: ReExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Map zip back to management_pack for the API
  const apiFormat = format === "zip" ? "management_pack" : format;

  async function handleReExport() {
    setLoading(true);
    setError(false);
    try {
      const visibleLayout = getVisibleExportLayout(defaultExportLayout);
      const res = await fetch(`/api/runs/${runId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: apiFormat, layout: visibleLayout }),
      });

      if (!res.ok) {
        setError(true);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleReExport}
      disabled={loading}
      title={error ? "Download failed — click to retry" : `Re-download ${fileName}`}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50 ${
        error
          ? "border-[var(--color-danger-border)] text-[var(--color-danger)] hover:opacity-80"
          : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      }`}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Download className="h-3 w-3" />
      )}
      {error ? "Retry" : "Download"}
    </button>
  );
}
