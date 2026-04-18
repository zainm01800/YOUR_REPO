import ExcelJS from "exceljs";
import type { TransactionRecord } from "@/lib/domain/types";
import { slugify } from "@/lib/utils";

export interface ParsedTransactionFile {
  headers: string[];
  records: Record<string, string | number | undefined>[];
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalString(value: unknown) {
  const stringValue = String(value ?? "").trim();
  return stringValue || undefined;
}

function toDateString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  // JavaScript Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value.toISOString().slice(0, 10);
  }
  // Excel serial date number (days since 1900-01-01, with Excel's leap-year bug offset)
  if (typeof value === "number") {
    // 25569 is the number of days between 1900-01-01 and 1970-01-01
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  if (!str) return undefined;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return str; // pass through unrecognised formats as-is
}

function pickFirstRecordValue(
  record: Record<string, string | number | undefined>,
  keys: Array<string | undefined>,
) {
  for (const key of keys) {
    if (!key) continue;
    const value = record[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) {
      return value;
    }
  }
  return undefined;
}

export async function parseTransactionFile(buffer: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { headers: [], records: [] } satisfies ParsedTransactionFile;
  }

  const records: Record<string, string | number | undefined>[] = [];
  const headers: string[] = [];

  // Get headers from first row
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || "").trim();
  });

  // Get data from subsequent rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip headers
    
    const record: Record<string, string | number | undefined> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1);
      
      // ExcelJS handles values differently depending on cell type
      let value: any = cell.value;
      if (value && typeof value === 'object' && 'result' in value) {
        value = value.result; // handle formula results
      }

      record[header] = value === null ? undefined : value;
    });
    records.push(record);
  });

  return { headers: headers.filter(Boolean), records } satisfies ParsedTransactionFile;
}

export function mapTransactions(
  parsed: ParsedTransactionFile,
  columnMappings: Record<string, string>,
  fallbackCurrency = "GBP",
) {
  return parsed.records.map<TransactionRecord>((record, index) => {
    const dateValue = pickFirstRecordValue(record, [
      columnMappings.date,
      columnMappings.postedDate,
      columnMappings.startedDate,
    ]);
    const amountValue = pickFirstRecordValue(record, [
      columnMappings.amount,
      columnMappings.grossAmount,
      columnMappings.valueAmount,
    ]);
    const descriptionValue = pickFirstRecordValue(record, [
      columnMappings.description,
      columnMappings.details,
      columnMappings.memo,
    ]);
    const merchantValue = pickFirstRecordValue(record, [
      columnMappings.merchant,
      columnMappings.payee,
      columnMappings.supplier,
      columnMappings.vendor,
      columnMappings.counterparty,
      columnMappings.description,
    ]);
    const referenceValue = pickFirstRecordValue(record, [
      columnMappings.reference,
      columnMappings.id,
      columnMappings.receipt,
      columnMappings.type,
    ]);
    const currencyValue = pickFirstRecordValue(record, [
      columnMappings.currency,
      columnMappings.ccy,
    ]);

    return {
      id: `txn_import_${index + 1}_${slugify(String(referenceValue || descriptionValue || merchantValue || index))}`,
      sourceLineNumber: index + 2,
      transactionDate: toDateString(dateValue),
      amount: toNumber(amountValue),
      merchant: String(merchantValue || "Unknown merchant"),
      description: String(descriptionValue || merchantValue || ""),
      employee: toOptionalString(record[columnMappings.employee]),
      currency: String(currencyValue || fallbackCurrency),
      reference: toOptionalString(referenceValue),
    };
  });
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
    date: findMatch(["completed date", "posted date", "booking date", "date"]),
    postedDate: findMatch(["completed date", "posted date", "booking date"]),
    startedDate: findMatch(["started date", "created date"]),
    amount: findMatch(["amount", "gross", "value"]),
    grossAmount: findMatch(["gross", "amount"]),
    valueAmount: findMatch(["value"]),
    merchant: findMatch(["merchant", "supplier", "payee", "vendor", "counterparty"]),
    payee: findMatch(["payee"]),
    supplier: findMatch(["supplier"]),
    vendor: findMatch(["vendor"]),
    counterparty: findMatch(["counterparty"]),
    description: findMatch(["description", "memo", "details", "narrative"]),
    details: findMatch(["details", "narrative"]),
    memo: findMatch(["memo"]),
    employee: findMatch(["employee", "cardholder", "user"]),
    currency: findMatch(["currency", "ccy"]),
    ccy: findMatch(["ccy"]),
    reference: findMatch(["reference", "transaction id", "id", "receipt", "type"]),
    type: findMatch(["type"]),
    id: findMatch(["transaction id", "id"]),
    receipt: findMatch(["receipt"]),
  };

  return Object.fromEntries(
    Object.entries(mapping).filter(([, value]) => typeof value === "string"),
  ) as Record<string, string>;
}
