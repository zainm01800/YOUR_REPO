import type {
  BankStatement,
  BankTransaction,
  BankTransactionReconciliationStatus,
  MatchStatus,
  ReconciliationRun,
  TransactionRecord,
} from "@/lib/domain/types";
import { slugify } from "@/lib/utils";

function toDateOnly(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString().slice(0, 10);
}

function firstDefined<T>(values: Array<T | undefined>) {
  return values.find((value) => value !== undefined);
}

export function deriveStatementMetadata(
  fileName: string,
  transactions: TransactionRecord[],
  fallbackCurrency = "GBP",
) {
  const datedTransactions = transactions
    .map((transaction) => ({
      ...transaction,
      effectiveDate: toDateOnly(transaction.transactionDate || transaction.postedDate),
    }))
    .filter((transaction) => Boolean(transaction.effectiveDate))
    .sort((left, right) => String(left.effectiveDate).localeCompare(String(right.effectiveDate)));

  const first = datedTransactions[0];
  const last = datedTransactions[datedTransactions.length - 1];
  const lowerFileName = fileName.toLowerCase();

  let bankName: string | undefined;
  if (lowerFileName.includes("revolut")) bankName = "Revolut";
  else if (lowerFileName.includes("barclays")) bankName = "Barclays";
  else if (lowerFileName.includes("lloyds")) bankName = "Lloyds";
  else if (lowerFileName.includes("monzo")) bankName = "Monzo";
  else if (lowerFileName.includes("starling")) bankName = "Starling";
  else if (lowerFileName.includes("paypal")) bankName = "PayPal";

  const accountName = firstDefined(
    transactions.map((transaction) => transaction.reference?.trim() || undefined),
  );

  return {
    bankName,
    accountName,
    currency: firstDefined(transactions.map((transaction) => transaction.currency)) || fallbackCurrency,
    dateRangeStart: first?.effectiveDate,
    dateRangeEnd: last?.effectiveDate,
  };
}

export function cloneBankTransactionsForRun(
  statement: BankStatement,
  transactions: BankTransaction[],
) {
  return transactions.map<TransactionRecord>((transaction, index) => ({
    ...transaction,
    id: `txn_run_${statement.id}_${slugify(transaction.reference || transaction.description || transaction.merchant || String(index + 1))}_${index + 1}`,
    sourceBankTransactionId: transaction.id,
    bankStatementId: statement.id,
    bankStatementName: statement.name,
    sourceLineNumber: transaction.sourceLineNumber ?? index + 2,
  }));
}

function mapRunMatchStatusToBankStatus(
  status: MatchStatus,
): BankTransactionReconciliationStatus {
  switch (status) {
    case "matched":
      return "matched";
    case "probable_match":
    case "multiple_candidates":
      return "suggested_match";
    case "duplicate_suspected":
      return "partially_matched";
    case "unmatched":
    default:
      return "unreconciled";
  }
}

export function deriveBankTransactionStatus(
  transactionId: string,
  runs: ReconciliationRun[],
): Pick<BankTransaction, "reconciliationStatus" | "matchedRunId" | "matchedRunName"> {
  const references = runs.flatMap((run) =>
    run.transactions
      .filter((transaction) => transaction.sourceBankTransactionId === transactionId)
      .map((transaction) => ({ run, transaction })),
  );

  if (references.length === 0) {
    return {
      reconciliationStatus: "unreconciled",
    };
  }

  const hasExcluded = references.some(({ transaction }) => transaction.excludedFromExport);
  if (hasExcluded && references.every(({ transaction }) => transaction.excludedFromExport)) {
    const latest = references[0];
    return {
      reconciliationStatus: "excluded",
      matchedRunId: latest.run.id,
      matchedRunName: latest.run.name,
    };
  }

  const decorated = references.map(({ run, transaction }) => {
    const match = run.matches.find(
      (candidate) =>
        candidate.transactionId === transaction.id &&
        candidate.selected,
    );

    return {
      run,
      transaction,
      match,
      derivedStatus: mapRunMatchStatusToBankStatus(match?.status ?? "unmatched"),
    };
  });

  const confirmed = decorated.find(
    ({ derivedStatus, run }) => derivedStatus === "matched" && (run.locked || run.status === "exported"),
  );
  if (confirmed) {
    return {
      reconciliationStatus: "confirmed",
      matchedRunId: confirmed.run.id,
      matchedRunName: confirmed.run.name,
    };
  }

  const matched = decorated.find(({ derivedStatus }) => derivedStatus === "matched");
  if (matched) {
    return {
      reconciliationStatus: "matched",
      matchedRunId: matched.run.id,
      matchedRunName: matched.run.name,
    };
  }

  const suggested = decorated.find(({ derivedStatus }) => derivedStatus === "suggested_match");
  if (suggested) {
    return {
      reconciliationStatus: "suggested_match",
      matchedRunId: suggested.run.id,
      matchedRunName: suggested.run.name,
    };
  }

  const partial = decorated.find(({ derivedStatus }) => derivedStatus === "partially_matched");
  if (partial) {
    return {
      reconciliationStatus: "partially_matched",
      matchedRunId: partial.run.id,
      matchedRunName: partial.run.name,
    };
  }

  return {
    reconciliationStatus: "unreconciled",
    matchedRunId: decorated[0]?.run.id,
    matchedRunName: decorated[0]?.run.name,
  };
}

export function decorateBankStatementsWithStatuses(
  statements: BankStatement[],
  runs: ReconciliationRun[],
) {
  return statements.map((statement) => ({
    ...statement,
    transactionCount: statement.transactions.length,
    transactions: statement.transactions.map((transaction) => ({
      ...transaction,
      ...deriveBankTransactionStatus(transaction.id, runs),
    })),
  }));
}

export function pickTransactionsForBankSource(
  statements: BankStatement[],
  runs: ReconciliationRun[],
  mode: "statement" | "all_unreconciled",
  statementId?: string,
) {
  const decoratedStatements = decorateBankStatementsWithStatuses(statements, runs);

  if (mode === "statement") {
    const statement = decoratedStatements.find((candidate) => candidate.id === statementId);
    if (!statement) {
      return {
        statement: undefined,
        transactions: [] as BankTransaction[],
        label: undefined as string | undefined,
      };
    }

    return {
      statement,
      transactions: statement.transactions,
      label: statement.name,
    };
  }

  const transactions = decoratedStatements.flatMap((statement) =>
    statement.transactions.filter((transaction) =>
      ["unreconciled", "suggested_match", "partially_matched"].includes(transaction.reconciliationStatus),
    ),
  );

  return {
    statement: undefined,
    transactions,
    label: "All unreconciled transactions",
  };
}
