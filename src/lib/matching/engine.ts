import type {
  ExtractedDocument,
  MatchDecision,
  MatchRationale,
  MatchStatus,
  TransactionRecord,
} from "@/lib/domain/types";

export interface MatchOptions {
  /** Maximum absolute difference in amounts before score drops to zero. Default 1.5 */
  amountTolerance?: number;
  /** Maximum days between transaction date and invoice date. Default 5 */
  dateToleranceDays?: number;
}

function normaliseText(value?: string) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenOverlap(a?: string, b?: string) {
  const aTokens = new Set(normaliseText(a).split(" ").filter(Boolean));
  const bTokens = new Set(normaliseText(b).split(" ").filter(Boolean));
  if (!aTokens.size || !bTokens.size) return 0;
  const shared = [...aTokens].filter((token) => bTokens.has(token));
  return shared.length / Math.max(aTokens.size, bTokens.size);
}

function getDateDistanceDays(a?: string, b?: string) {
  if (!a || !b) return undefined;
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  if (isNaN(first) || isNaN(second)) return undefined;
  return Math.abs(first - second) / (1000 * 60 * 60 * 24);
}

/**
 * Returns 0–1 indicating how confidently an invoice/reference number was
 * found inside one of the search targets (description, raw text, filename …).
 */
function findNumberInTargets(needle?: string, ...targets: (string | undefined)[]): number {
  if (!needle || needle.length < 3) return 0;
  const n = normaliseText(needle);
  for (const t of targets) {
    if (!t) continue;
    const h = normaliseText(t);
    if (h === n) return 1;
    if (h.includes(n)) return 0.85;
  }
  return 0;
}

export function scoreMatch(
  transaction: TransactionRecord,
  document: ExtractedDocument,
  options?: MatchOptions,
): MatchDecision {
  const amountTolerance = options?.amountTolerance ?? 1.5;
  const dateToleranceDays = options?.dateToleranceDays ?? 5;

  const transactionAmount = Math.abs(transaction.amount);
  const amountDifference = Math.abs(transactionAmount - (document.gross || 0));
  const dateDistance = getDateDistanceDays(transaction.transactionDate, document.issueDate);

  // ── Invoice number (strongest signal) ───────────────────────────────────
  // If the document number appears in the transaction's reference or
  // description it is almost certainly the correct match.
  const invNumConfidence = findNumberInTargets(
    document.documentNumber,
    transaction.reference,
    transaction.description,
    transaction.externalId,
  );
  const invoiceNumberScore = Math.round(invNumConfidence * 35);

  // ── Explicit reference number ────────────────────────────────────────────
  const refConfidence = transaction.reference
    ? findNumberInTargets(transaction.reference, document.rawExtractedText, document.documentNumber)
    : 0;
  const referenceScore = Math.round(refConfidence * 15);

  // ── Supplier / description similarity ───────────────────────────────────
  const supplierSimilarity = Math.max(
    tokenOverlap(transaction.merchant, document.supplier),
    tokenOverlap(transaction.description, document.rawExtractedText),
  );

  // ── Filename similarity ──────────────────────────────────────────────────
  const filenameSimilarity = Math.max(
    tokenOverlap(transaction.reference, document.fileName),
    tokenOverlap(transaction.description, document.fileName),
  );

  // ── Employee similarity ──────────────────────────────────────────────────
  const employeeSimilarity = tokenOverlap(transaction.employee, document.rawExtractedText);

  // ── Currency ─────────────────────────────────────────────────────────────
  const currencyScore =
    transaction.currency && document.currency
      ? transaction.currency === document.currency ? 5 : -12
      : 0;

  // ── Amount (configurable tolerance) ──────────────────────────────────────
  let amountScore = 0;
  if (amountDifference === 0) amountScore = 40;
  else if (amountDifference <= amountTolerance) amountScore = 30;
  else if (amountDifference <= amountTolerance * 3) amountScore = 18;

  // ── Date (configurable tolerance) ────────────────────────────────────────
  let dateScore = 0;
  if (dateDistance !== undefined) {
    if (dateDistance === 0) dateScore = 20;
    else if (dateDistance <= Math.max(2, dateToleranceDays * 0.4)) dateScore = 16;
    else if (dateDistance <= dateToleranceDays) dateScore = 10;
  }

  const supplierScore = Math.round(supplierSimilarity * 20);
  const filenameScore = Math.round(filenameSimilarity * 10);
  const employeeScore = Math.round(employeeSimilarity * 5);

  const score = Math.max(
    0,
    amountScore + dateScore + supplierScore + filenameScore +
    employeeScore + currencyScore + invoiceNumberScore + referenceScore,
  );

  const notes: string[] = [];
  if (invoiceNumberScore >= 25) notes.push("Invoice number found in transaction reference.");
  if (referenceScore >= 10) notes.push("Transaction reference appears in the document.");
  if (amountScore >= 30) notes.push("Amount aligns with the extracted gross.");
  if (dateScore >= 16) notes.push("Transaction date is close to invoice date.");
  if (supplierScore >= 10) notes.push("Supplier and merchant names are similar.");
  if (filenameScore >= 5) notes.push("Receipt filename resembles the reference.");
  if (currencyScore < 0) notes.push("Currency differs between source and document.");

  let status: MatchStatus = "unmatched";
  if (score >= 85) status = "matched";
  else if (score >= 65) status = "probable_match";
  else if (score >= 50) status = "multiple_candidates";

  const rationale: MatchRationale = {
    amountScore, dateScore, supplierScore, filenameScore,
    employeeScore, currencyScore, invoiceNumberScore, referenceScore, notes,
  };

  return {
    id: `match_${transaction.id}_${document.id}`,
    transactionId: transaction.id,
    documentId: document.id,
    status, score,
    selected: true,
    rationale,
  };
}

export function runMatchingEngine(
  transactions: TransactionRecord[],
  documents: ExtractedDocument[],
  options?: MatchOptions,
) {
  return transactions.map((transaction) => {
    const candidates = documents
      .map((doc) => scoreMatch(transaction, doc, options))
      .sort((a, b) => b.score - a.score);

    const top = candidates[0];
    const second = candidates[1];

    if (!top || top.score === 0) {
      return {
        id: `match_${transaction.id}_none`,
        transactionId: transaction.id,
        status: "unmatched" as const,
        score: 0,
        selected: true,
        rationale: {
          amountScore: 0, dateScore: 0, supplierScore: 0, filenameScore: 0,
          employeeScore: 0, currencyScore: 0, invoiceNumberScore: 0, referenceScore: 0,
          notes: ["No receipt candidate met the threshold."],
        },
      };
    }

    if (second && Math.abs(top.score - second.score) <= 5 && top.score >= 55) {
      return {
        ...top,
        status: "multiple_candidates" as const,
        rationale: {
          ...top.rationale,
          notes: [...top.rationale.notes, "Several candidates scored similarly."],
        },
      };
    }

    return top;
  });
}
