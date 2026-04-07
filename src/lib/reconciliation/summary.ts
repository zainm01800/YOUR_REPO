import type { ReviewRow, RunProcessingSummary } from "@/lib/domain/types";

export function buildRunSummary(rows: ReviewRow[]): RunProcessingSummary {
  return {
    transactions: rows.length,
    documents: rows.filter((row) => row.documentId).length,
    matched: rows.filter((row) => row.matchStatus === "matched").length,
    probable: rows.filter((row) => row.matchStatus === "probable_match").length,
    multipleCandidates: rows.filter(
      (row) => row.matchStatus === "multiple_candidates",
    ).length,
    unmatched: rows.filter((row) => row.matchStatus === "unmatched").length,
    duplicates: rows.filter((row) => row.matchStatus === "duplicate_suspected")
      .length,
    exceptions: rows.filter((row) => row.exceptions.length > 0).length,
  };
}

