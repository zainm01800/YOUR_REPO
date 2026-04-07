import * as XLSX from "xlsx";
import type { TransactionRecord } from "@/lib/domain/types";
import { slugify } from "@/lib/utils";

export interface ParsedTransactionFile {
  headers: string[];
  records: Record<string, string | number | undefined>[];
}

function toRecords(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<Record<string, string | number | undefined>>(
    sheet,
    { defval: "" },
  );
}

export function parseTransactionFile(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const records = toRecords(sheet);
  const headers = records.length ? Object.keys(records[0]) : [];

  return { headers, records } satisfies ParsedTransactionFile;
}

export function mapTransactions(
  parsed: ParsedTransactionFile,
  columnMappings: Record<string, string>,
) {
  return parsed.records.map<TransactionRecord>((record, index) => ({
    id: `txn_import_${index + 1}_${slugify(String(record[columnMappings.reference] || index))}`,
    sourceLineNumber: index + 2,
    transactionDate: String(record[columnMappings.date] || "") || undefined,
    amount: Number(record[columnMappings.amount] || 0),
    merchant: String(record[columnMappings.merchant] || "Unknown merchant"),
    description: String(
      record[columnMappings.description] || record[columnMappings.merchant] || "",
    ),
    employee: String(record[columnMappings.employee] || "") || undefined,
    currency: String(record[columnMappings.currency] || "GBP"),
    reference: String(record[columnMappings.reference] || "") || undefined,
  }));
}

export function detectDefaultMapping(headers: string[]) {
  const normalised = headers.map((header) => ({
    raw: header,
    clean: header.toLowerCase(),
  }));

  function findMatch(patterns: string[]) {
    return normalised.find((header) =>
      patterns.some((pattern) => header.clean.includes(pattern)),
    )?.raw;
  }

  const mapping = {
    date: findMatch(["date"]),
    amount: findMatch(["amount", "gross", "value"]),
    merchant: findMatch(["merchant", "supplier", "payee", "vendor"]),
    description: findMatch(["description", "memo", "details"]),
    employee: findMatch(["employee", "cardholder", "user"]),
    currency: findMatch(["currency"]),
    reference: findMatch(["reference", "id", "receipt"]),
  };

  return Object.fromEntries(
    Object.entries(mapping).filter(([, value]) => typeof value === "string"),
  ) as Record<string, string>;
}
