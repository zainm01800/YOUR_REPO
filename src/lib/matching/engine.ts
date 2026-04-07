import type {
  ExtractedDocument,
  MatchDecision,
  MatchRationale,
  MatchStatus,
  TransactionRecord,
} from "@/lib/domain/types";

function normaliseText(value?: string) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenOverlap(a?: string, b?: string) {
  const aTokens = new Set(normaliseText(a).split(" ").filter(Boolean));
  const bTokens = new Set(normaliseText(b).split(" ").filter(Boolean));

  if (!aTokens.size || !bTokens.size) {
    return 0;
  }

  const shared = [...aTokens].filter((token) => bTokens.has(token));
  return shared.length / Math.max(aTokens.size, bTokens.size);
}

function getDateDistanceDays(a?: string, b?: string) {
  if (!a || !b) {
    return undefined;
  }

  const first = new Date(a).getTime();
  const second = new Date(b).getTime();

  return Math.abs(first - second) / (1000 * 60 * 60 * 24);
}

export function scoreMatch(
  transaction: TransactionRecord,
  document: ExtractedDocument,
): MatchDecision {
  const amountDifference = Math.abs(transaction.amount - (document.gross || 0));
  const dateDistance = getDateDistanceDays(
    transaction.transactionDate,
    document.issueDate,
  );
  const supplierSimilarity = Math.max(
    tokenOverlap(transaction.merchant, document.supplier),
    tokenOverlap(transaction.description, document.rawExtractedText),
  );
  const filenameSimilarity = Math.max(
    tokenOverlap(transaction.reference, document.fileName),
    tokenOverlap(transaction.description, document.fileName),
  );
  const employeeSimilarity = tokenOverlap(
    transaction.employee,
    document.rawExtractedText,
  );
  const currencyScore =
    transaction.currency && document.currency
      ? transaction.currency === document.currency
        ? 5
        : -12
      : 0;

  let amountScore = 0;
  if (amountDifference === 0) {
    amountScore = 40;
  } else if (amountDifference <= 1) {
    amountScore = 30;
  } else if (amountDifference <= 5) {
    amountScore = 18;
  }

  let dateScore = 0;
  if (dateDistance !== undefined) {
    if (dateDistance === 0) {
      dateScore = 20;
    } else if (dateDistance <= 2) {
      dateScore = 16;
    } else if (dateDistance <= 5) {
      dateScore = 10;
    }
  }

  const supplierScore = Math.round(supplierSimilarity * 20);
  const filenameScore = Math.round(filenameSimilarity * 10);
  const employeeScore = Math.round(employeeSimilarity * 5);
  const score = Math.max(
    0,
    amountScore +
      dateScore +
      supplierScore +
      filenameScore +
      employeeScore +
      currencyScore,
  );

  const notes: string[] = [];
  if (amountScore >= 30) notes.push("Amount aligns with the extracted gross.");
  if (dateScore >= 16) notes.push("Transaction date is close to issue date.");
  if (supplierScore >= 10) notes.push("Supplier and merchant names are similar.");
  if (filenameScore >= 5) notes.push("Receipt filename resembles the reference.");
  if (currencyScore < 0) notes.push("Currency differs between source and document.");

  let status: MatchStatus = "unmatched";
  if (score >= 85) {
    status = "matched";
  } else if (score >= 65) {
    status = "probable_match";
  } else if (score >= 50) {
    status = "multiple_candidates";
  }

  const rationale: MatchRationale = {
    amountScore,
    dateScore,
    supplierScore,
    filenameScore,
    employeeScore,
    currencyScore,
    notes,
  };

  return {
    id: `match_${transaction.id}_${document.id}`,
    transactionId: transaction.id,
    documentId: document.id,
    status,
    score,
    selected: true,
    rationale,
  };
}

export function runMatchingEngine(
  transactions: TransactionRecord[],
  documents: ExtractedDocument[],
) {
  return transactions.map((transaction) => {
    const candidates = documents
      .map((document) => scoreMatch(transaction, document))
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
          amountScore: 0,
          dateScore: 0,
          supplierScore: 0,
          filenameScore: 0,
          employeeScore: 0,
          currencyScore: 0,
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

