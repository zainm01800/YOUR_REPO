"use client";

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  defaultExportLayout,
  getVisibleExportLayout,
  normaliseExportLayout,
} from "@/lib/export/layout";
import {
  mapReviewTemplateToExportLayout,
  normaliseReviewTemplates,
  reviewTemplateStorageKey,
} from "@/lib/review-templates";

export function ExportDownloadPanel({
  runId,
  compact = false,
}: {
  runId: string;
  /** Compact mode shows just the two buttons side-by-side, no label text */
  compact?: boolean;
}) {
  const [downloading, setDownloading] = useState<"csv" | "xlsx" | "management_pack" | null>(null);
  const [layout, setLayout] = useState(defaultExportLayout);

  // Derive export layout from saved review template on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(reviewTemplateStorageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const templates = normaliseReviewTemplates(saved);
      // Use the first non-default template if available, otherwise default
      const active = templates[0];
      if (active) {
        const mapped = mapReviewTemplateToExportLayout(
          active,
          normaliseExportLayout(defaultExportLayout),
        );
        setLayout(mapped);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  async function handleDownload(format: "csv" | "xlsx" | "management_pack") {
    setDownloading(format as any);
    try {
      const visibleLayout = getVisibleExportLayout(layout);
      const response = await fetch(`/api/runs/${runId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, layout: visibleLayout }),
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "management_pack" ? `${runId}-pack.zip` : `${runId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user can retry
    } finally {
      setDownloading(null);
    }
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleDownload("csv")}
          disabled={downloading !== null}
        >
          {downloading === "csv" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          CSV
        </Button>
        <Button
          type="button"
          onClick={() => handleDownload("xlsx")}
          disabled={downloading !== null}
        >
          {downloading === "xlsx" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 h-4 w-4" />
          )}
          Excel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Standard downloads use the column layout from your active review template.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleDownload("csv")}
            disabled={downloading !== null}
          >
            {downloading === "csv" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download CSV
          </Button>
          <Button
            type="button"
            onClick={() => handleDownload("xlsx")}
            disabled={downloading !== null}
          >
            {downloading === "xlsx" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Download Excel
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5 flex items-center justify-between">
         <div className="space-y-1">
            <h4 className="text-sm font-bold text-indigo-950">Management Pack</h4>
            <p className="text-xs text-indigo-900/60">Generate a ZIP archive containing the reconciled ledger, trial balance, and all supporting PDF documents.</p>
         </div>
         <Button 
          type="button"
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          onClick={() => handleDownload("management_pack")}
          disabled={downloading !== null}
         >
           {downloading === "management_pack" ? (
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
           ) : (
             <Download className="mr-2 h-4 w-4" />
           )}
           Export Management Pack
         </Button>
      </div>
    </div>
  );
}
