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
  return run.transactions.flatMap<ReviewRow>((transaction) => {
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
    const glCode = transaction.glCode || suggestGlCode(transaction, glRules, run);

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

    const taxLines =
      document?.taxLines && document.taxLines.length > 0 ? document.taxLines : [undefined];

    return taxLines.map((taxLine, taxLineIndex) => {
      const vatCode =
        transaction.vatCode || resolveVatCode(document, vatRules, taxLine?.rate);
      const rowExceptions = [...exceptions];

      if (!vatCode && document) {
        rowExceptions.push({
          code: "missing_vat_code",
          severity: "medium",
          message: "No VAT code was derived from the configured tax rules.",
        });
      }

      return {
        id: taxLine?.id ? `row_${transaction.id}__tax_${taxLine.id}` : `row_${transaction.id}`,
        transactionId: transaction.id,
        documentId: document?.id,
        taxLineId: taxLine?.id,
        taxLineLabel:
          taxLine?.label ||
          (document?.taxLines.length && document.taxLines.length > 1
            ? `VAT line ${taxLineIndex + 1}`
            : undefined),
        source: run.transactionFileName || "Manual upload",
        supplier: document?.supplier || transaction.merchant,
        date: document?.issueDate || transaction.transactionDate,
        currency: document?.currency || transaction.currency,
        originalAmount: transaction.amount,
        originalCurrency: transaction.currency,
        net: taxLine ? taxLine.netAmount : document ? (document.net ?? document.gross ?? undefined) : undefined,
        vat: taxLine ? taxLine.taxAmount : document ? (document.vat ?? 0) : undefined,
        gross: taxLine ? taxLine.grossAmount : document?.gross || transaction.amount,
        vatPercent: taxLine?.rate,
        vatCode,
        glCode,
        matchStatus: match?.status || "unmatched",
        confidence: document?.confidence || 0,
        originalDescription:
          taxLine?.label && document?.taxLines.length && document.taxLines.length > 1
            ? `${transaction.description} - ${taxLine.label}`
            : transaction.description,
        employee: transaction.employee,
        notes: match?.rationale.notes.join(" "),
        approved: rowExceptions.every((exception) => exception.severity !== "high"),
        excludedFromExport: !!transaction.excludedFromExport,
        exceptions: rowExceptions,
      };
    });
  });
}
