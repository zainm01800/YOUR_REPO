import type { ReviewRow, RunProcessingSummary } from "@/lib/domain/types";

export function buildRunSummary(rows: ReviewRow[]): RunProcessingSummary {
  const matched = rows.filter((row) => row.matchStatus === "matched").length;
  const total = rows.length;

  const exportableRows = rows.filter((r) => !r.excludedFromExport);
  const totalGross = exportableRows.reduce((s, r) => s + (r.grossInRunCurrency ?? r.gross ?? 0), 0);
  const totalNet = exportableRows.reduce((s, r) => s + (r.netInRunCurrency ?? r.net ?? 0), 0);
  const totalVat = exportableRows.reduce((s, r) => s + (r.vatInRunCurrency ?? r.vat ?? 0), 0);
  const totalVatClaimable = exportableRows
    .filter((r) => r.vatCode && r.vat !== undefined && r.vat > 0)
    .reduce((s, r) => s + (r.vatInRunCurrency ?? r.vat ?? 0), 0);

  return {
    transactions: total,
    documents: rows.filter((row) => row.documentId).length,
    matched,
    probable: rows.filter((row) => row.matchStatus === "probable_match").length,
    multipleCandidates: rows.filter((row) => row.matchStatus === "multiple_candidates").length,
    unmatched: rows.filter((row) => row.matchStatus === "unmatched").length,
    duplicates: rows.filter((row) => row.matchStatus === "duplicate_suspected").length,
    exceptions: rows.filter((row) => row.exceptions.length > 0).length,
    totalGross: Math.round(totalGross * 100) / 100,
    totalNet: Math.round(totalNet * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    totalVatClaimable: Math.round(totalVatClaimable * 100) / 100,
    matchRatePct: total > 0 ? Math.round((matched / total) * 100) : 0,
  };
}
