import type {
  MatchDecision,
  ReconciliationRun,
  ReviewRow,
  RunRowException,
  VatRule,
  GlCodeRule,
} from "@/lib/domain/types";
import { suggestGlCode } from "@/lib/gl/suggester";
import { detectVatExceptions, resolveVatCode } from "@/lib/tax/rules-engine";

function findSelectedMatch(run: ReconciliationRun, transactionId: string) {
  return run.matches.find(
    (match) => match.transactionId === transactionId && match.selected,
  );
}

function buildBaseExceptions(
  run: ReconciliationRun,
  match: MatchDecision | undefined,
  transactionAmount: number,
  documentGross?: number,
  confidence = 1,
  noReceiptRequired = false,
) {
  const exceptions: RunRowException[] = [];
  const linkedDocumentUsages = run.matches.filter(
    (candidate) => candidate.documentId && candidate.documentId === match?.documentId,
  );

  if (!match?.documentId && !noReceiptRequired) {
    exceptions.push({
      code: "missing_receipt",
      severity: "high",
      message: "No receipt or invoice has been matched to this transaction.",
    });
  }

  if (
    match?.documentId &&
    documentGross !== undefined &&
    Math.abs(transactionAmount - documentGross) > 1.5
  ) {
    exceptions.push({
      code: "amount_mismatch",
      severity: "high",
      message: "Transaction amount and extracted gross differ beyond tolerance.",
    });
  }

  if (confidence < 0.75) {
    exceptions.push({
      code: "low_confidence_extraction",
      severity: "medium",
      message: "Document extraction confidence is below the safe review threshold.",
    });
  }

  if (linkedDocumentUsages.length > 1) {
    exceptions.push({
      code: "same_receipt_used_twice",
      severity: "high",
      message: "The same receipt appears to be linked to more than one transaction.",
    });
  }

  return exceptions;
}

export function buildReviewRows(
  run: ReconciliationRun,
  vatRules: VatRule[],
  glRules: GlCodeRule[],
) {
  return run.transactions.map<ReviewRow>((transaction) => {
    const match = findSelectedMatch(run, transaction.id);
    const document = run.documents.find((candidate) => candidate.id === match?.documentId);
    const taxExceptions = detectVatExceptions(document, vatRules);
    const exceptions = [
      ...buildBaseExceptions(
        run,
        match,
        transaction.amount,
        document?.gross,
        document?.confidence,
        transaction.noReceiptRequired,
      ),
      ...taxExceptions,
    ];
    const vatCode = transaction.vatCode || resolveVatCode(document, vatRules);
    const glCode = transaction.glCode || suggestGlCode(transaction, glRules, run);

    if (!vatCode && document) {
      exceptions.push({
        code: "missing_vat_code",
        severity: "medium",
        message: "No VAT code was derived from the configured tax rules.",
      });
    }

    if (!glCode) {
      exceptions.push({
        code: "missing_gl_code",
        severity: "medium",
        message: "No GL code suggestion is available for this row.",
      });
    }

    if (
      document?.currency &&
      transaction.currency &&
      document.currency !== transaction.currency
    ) {
      exceptions.push({
        code: "currency_mismatch",
        severity: "medium",
        message: "Transaction currency differs from the extracted document currency.",
      });
    }

    const primaryTaxLine = document?.taxLines[0];

    return {
      id: `row_${transaction.id}`,
      transactionId: transaction.id,
      documentId: document?.id,
      source: run.transactionFileName || "Manual upload",
      supplier: document?.supplier || transaction.merchant,
      date: document?.issueDate || transaction.transactionDate,
      currency: document?.currency || transaction.currency,
      net: document?.net,
      vat: document?.vat,
      gross: document?.gross || transaction.amount,
      vatPercent: primaryTaxLine?.rate,
      vatCode,
      glCode,
      matchStatus: match?.status || "unmatched",
      confidence: document?.confidence || 0,
      originalDescription: transaction.description,
      employee: transaction.employee,
      notes: match?.rationale.notes.join(" "),
      approved: exceptions.every((exception) => exception.severity !== "high"),
      excludedFromExport: !!transaction.excludedFromExport,
      exceptions,
    };
  });
}
