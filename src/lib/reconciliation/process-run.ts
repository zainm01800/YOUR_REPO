import { runMatchingEngine, type MatchOptions } from "@/lib/matching/engine";
import type {
  CategoryRule,
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
  categoryRules: CategoryRule[] = [],
  matchOptions?: MatchOptions,
) {
  const matches = runMatchingEngine(run.transactions, documents, matchOptions);
  const processedRun: ReconciliationRun = {
    ...run,
    status: "review_required",
    processedAt: new Date().toISOString(),
    documents,
    matches,
  };
  const rows = buildReviewRows(processedRun, vatRules, glRules, categoryRules);

  return {
    run: processedRun,
    rows,
    summary: buildRunSummary(rows),
  };
}
