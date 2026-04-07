import { runMatchingEngine } from "@/lib/matching/engine";
import type {
  ExtractedDocument,
  GlCodeRule,
  ReconciliationRun,
  VatRule,
} from "@/lib/domain/types";
import { buildReviewRows } from "@/lib/reconciliation/review-rows";
import { buildRunSummary } from "@/lib/reconciliation/summary";

export function processRun(
  run: ReconciliationRun,
  documents: ExtractedDocument[],
  vatRules: VatRule[],
  glRules: GlCodeRule[],
) {
  const matches = runMatchingEngine(run.transactions, documents);
  const processedRun: ReconciliationRun = {
    ...run,
    status: "review_required",
    processedAt: new Date().toISOString(),
    documents,
    matches,
  };
  const rows = buildReviewRows(processedRun, vatRules, glRules);

  return {
    run: processedRun,
    rows,
    summary: buildRunSummary(rows),
  };
}
