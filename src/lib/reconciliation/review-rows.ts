import type {
  CategoryRule,
  MatchDecision,
  ReconciliationRun,
  ReviewRow,
  RunRowException,
  VatRule,
  GlCodeRule,
} from "@/lib/domain/types";
import { suggestGlCode } from "@/lib/gl/suggester";
import { resolveCategory } from "@/lib/categories/suggester";
import {
  detectVatExceptions,
  getForeignVatNonClaimableException,
  isVatClaimableForRun,
  resolveVatCode,
} from "@/lib/tax/rules-engine";
import { convertAmount } from "@/lib/fx/rates";

/** Returns true if the string looks like a raw filename or UUID rather than a supplier name. */
function looksLikeFilename(name: string): boolean {
  return /^[a-f0-9_\-]{20,}$/i.test(name) || /\.(pdf|jpg|jpeg|png|webp)$/i.test(name);
}

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
  const comparableTransactionAmount = Math.abs(transactionAmount);
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
    Math.abs(comparableTransactionAmount - documentGross) > 1.5
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

function getJaccardSimilarity(s1: string, s2: string) {
  const set1 = new Set(s1.toLowerCase().split(/\s+/));
  const set2 = new Set(s2.toLowerCase().split(/\s+/));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

function detectDuplicateTransactionIds(run: ReconciliationRun): Set<string> {
  const duplicateIds = new Set<string>();
  const transactions = run.transactions;

  for (let i = 0; i < transactions.length; i++) {
    const tx1 = transactions[i];
    const date1 = tx1.transactionDate ? new Date(tx1.transactionDate).getTime() : 0;
    const amount1 = Math.abs(tx1.amount);
    const memo1 = (tx1.merchant || tx1.description || "").toLowerCase().trim();

    for (let j = i + 1; j < transactions.length; j++) {
      const tx2 = transactions[j];
      if (duplicateIds.has(tx2.id)) continue;

      const date2 = tx2.transactionDate ? new Date(tx2.transactionDate).getTime() : 0;
      const amount2 = Math.abs(tx2.amount);
      const memo2 = (tx2.merchant || tx2.description || "").toLowerCase().trim();

      // Same amount
      if (Math.abs(amount1 - amount2) < 0.01) {
        // Same date ± 1 day (86400000 ms)
        if (Math.abs(date1 - date2) <= 86400000) {
          // Exact memo match OR Jaccard > 0.6
          if (memo1 === memo2 || getJaccardSimilarity(memo1, memo2) > 0.6) {
            duplicateIds.add(tx2.id);
          }
        }
      }
    }
  }
  return duplicateIds;
}

export function buildReviewRows(
  run: ReconciliationRun,
  vatRules: VatRule[],
  glRules: GlCodeRule[],
  categoryRules: CategoryRule[] = [],
) {
  const runCurrency = run.defaultCurrency ?? "GBP";
  const runCountryCode = run.countryProfile;
  const fxRates = run.fxRates ?? {};
  const duplicateTransactionIds = detectDuplicateTransactionIds(run);

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
    const vatClaimable = isVatClaimableForRun(document, runCountryCode);
    const foreignVatException = getForeignVatNonClaimableException(
      document,
      runCountryCode,
    );

    if (foreignVatException) {
      exceptions.push(foreignVatException);
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

    if (duplicateTransactionIds.has(transaction.id)) {
      exceptions.push({
        code: "duplicate_transaction",
        severity: "high",
        message: "Another transaction with the same amount, date, and merchant exists in this run.",
      });
    }

    const category = resolveCategory(transaction, categoryRules);
    const taxLines =
      document?.taxLines && document.taxLines.length > 0 ? document.taxLines : [undefined];

    return taxLines.map((taxLine, taxLineIndex) => {
      const derivedVatCode = transaction.vatCode || resolveVatCode(document, vatRules, taxLine?.rate);
      const vatCode = vatClaimable ? derivedVatCode : undefined;
      const rowExceptions = [...exceptions];

      if (!vatCode && document && vatClaimable) {
        rowExceptions.push({
          code: "missing_vat_code",
          severity: "medium",
          message: "No VAT code was derived from the configured tax rules.",
        });
      }

      // Original value should represent the invoice/document native total when
      // a document is linked, not the individual transaction amount. This keeps
      // grouped VAT-line rows anchored to the full invoice total.
      const transactionAbsoluteAmount = Math.abs(transaction.amount);
      const effectiveOriginalAmount =
        document?.gross != null && document.gross > 0
          ? document.gross
          : transactionAbsoluteAmount > 0
            ? transactionAbsoluteAmount
            : 0;

      const docCurrency = document?.currency || transaction.currency;
      const effectiveOriginalCurrency = document?.currency || transaction.currency;
      const extractedGross = taxLine
        ? taxLine.grossAmount
        : (document?.gross != null && document.gross > 0
            ? document.gross
            : transactionAbsoluteAmount > 0 ? transactionAbsoluteAmount : undefined);
      const extractedNet = taxLine
        ? taxLine.netAmount
        : document ? (document.net ?? document.gross ?? undefined) : undefined;
      const extractedVat = taxLine
        ? taxLine.taxAmount
        : document ? (document.vat ?? 0) : undefined;
      const gross = extractedGross;
      const net = vatClaimable
        ? extractedNet
        : (gross ?? extractedNet);
      const vat = vatClaimable
        ? extractedVat
        : (gross !== undefined || extractedVat !== undefined ? 0 : undefined);
      const vatPercent = vatClaimable ? taxLine?.rate : 0;
      const grossDifference =
        gross !== undefined
          ? Number((Math.abs(transaction.amount) - gross).toFixed(2))
          : undefined;
      const grossComparisonStatus =
        gross === undefined
          ? "missing_document"
          : Math.abs(grossDifference ?? 0) === 0
            ? "exact"
            : Math.abs(grossDifference ?? 0) <= 1.5
              ? "close"
              : "mismatch";

      // FX conversion: only when document currency differs from run currency
      const needsConversion = docCurrency && docCurrency !== runCurrency;
      const fxRate = needsConversion ? fxRates[docCurrency] : undefined;
      const grossInRunCurrency = gross !== undefined && needsConversion
        ? convertAmount(gross, docCurrency, runCurrency, fxRates)
        : undefined;
      const netInRunCurrency = net !== undefined && needsConversion
        ? convertAmount(net, docCurrency, runCurrency, fxRates)
        : undefined;
      const vatInRunCurrency = vat !== undefined && needsConversion
        ? convertAmount(vat, docCurrency, runCurrency, fxRates)
        : undefined;

      return {
        id: taxLine?.id ? `row_${transaction.id}__tax_${taxLine.id}` : `row_${transaction.id}`,
        transactionId: transaction.id,
        sourceBankTransactionId: transaction.sourceBankTransactionId,
        bankStatementName: transaction.bankStatementName,
        documentId: document?.id,
        taxLineId: taxLine?.id,
        taxLineLabel:
          taxLine?.label ||
          (document?.taxLines.length && document.taxLines.length > 1
            ? `VAT line ${taxLineIndex + 1}`
            : undefined),
        source: run.transactionFileName || "Manual upload",
        supplier: (document?.supplier && !looksLikeFilename(document.supplier))
          ? document.supplier
          : transaction.merchant,
        date: document?.issueDate || transaction.transactionDate,
        currency: docCurrency,
        runCurrency,
        originalAmount: effectiveOriginalAmount,
        originalCurrency: effectiveOriginalCurrency,
        bankTransactionAmount: transactionAbsoluteAmount,
        net,
        vat,
        gross,
        grossInRunCurrency,
        netInRunCurrency,
        vatInRunCurrency,
        grossDifference,
        grossComparisonStatus,
        fxRate,
        vatPercent,
        vatCode,
        glCode,
        matchStatus: match?.status || "unmatched",
        confidence: document?.confidence || 0,
        originalDescription:
          taxLine?.label && document?.taxLines.length && document.taxLines.length > 1
            ? `${transaction.description} - ${taxLine.label}`
            : transaction.description,
        reference: transaction.reference,
        costCentre: transaction.costCentre,
        department: transaction.department,
        invoiceNumber: document?.documentNumber,
        vatNumber: document?.vatNumber,
        employee: transaction.employee,
        notes: match?.rationale.notes.join(" "),
        approvalStatus: "draft" as const,
        approved: rowExceptions.every((exception) => exception.severity !== "high"),
        excludedFromExport: !!transaction.excludedFromExport,
        exceptions: rowExceptions,
        category,
      };
    });
  });
}
