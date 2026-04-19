import ExcelJS from "exceljs";
import type { TransactionRecord } from "@/lib/domain/types";
import { slugify } from "@/lib/utils";

export interface BankPreset {
  name: string;
  /** Maps our internal field names to exact column headers this bank uses */
  mappings: Record<string, string>;
  /** Some banks export separate debit/credit columns instead of a signed amount */
  debitColumn?: string;
  creditColumn?: string;
  /** Filter rows: only import rows where this column equals this value */
  statusFilter?: { column: string; value: string };
}

/** Known column layouts for popular UK banks. Keys are lowercase identifiers. */
export const BANK_PRESETS: Record<string, BankPreset> = {
  monzo: {
    name: "Monzo",
    mappings: { date: "Date", merchant: "Name", description: "Notes and #tags", amount: "Amount", currency: "Currency", reference: "Type" },
  },
  starling: {
    name: "Starling",
    mappings: { date: "Date", merchant: "Counter Party", description: "Reference", amount: "Amount (GBP)", reference: "Type" },
  },
  revolut: {
    name: "Revolut",
    mappings: { date: "Completed Date", merchant: "Description", description: "Description", amount: "Amount", currency: "Currency", reference: "Type" },
  },
  barclays: {
    name: "Barclays",
    mappings: { date: "Date", merchant: "Memo", description: "Memo", amount: "Amount", reference: "Number" },
  },
  hsbc: {
    name: "HSBC",
    mappings: { date: "Date", merchant: "Description", description: "Description", reference: "Reference" },
    debitColumn: "Debit",
    creditColumn: "Credit",
  },
  natwest: {
    name: "NatWest",
    mappings: { date: "Date", merchant: "Description", description: "Description", amount: "Value", reference: "Type" },
  },
  rbs: {
    name: "RBS",
    mappings: { date: "Date", merchant: "Description", description: "Description", amount: "Value", reference: "Type" },
  },
  lloyds: {
    name: "Lloyds",
    mappings: { date: "Transaction Date", merchant: "Transaction Description", description: "Transaction Description", reference: "Transaction Type" },
    debitColumn: "Debit Amount",
    creditColumn: "Credit Amount",
  },
  halifax: {
    name: "Halifax",
    mappings: { date: "Date", merchant: "Transaction Description", description: "Transaction Description" },
    debitColumn: "Debit Amount",
    creditColumn: "Credit Amount",
  },
  santander: {
    name: "Santander",
    mappings: { date: "Date", merchant: "Description", description: "Description", amount: "Amount" },
  },
  paypal: {
    name: "PayPal",
    mappings: { date: "Date", merchant: "Name", description: "Type", amount: "Net", currency: "Currency", reference: "Transaction ID" },
    statusFilter: { column: "Status", value: "Completed" },
  },
  amex: {
    name: "American Express",
    mappings: { date: "Date", merchant: "Description", description: "Description", amount: "Amount", reference: "Reference" },
  },
};

/**
 * Detects the bank preset from column headers and/or a filename hint.
 * Returns the preset key (e.g. "monzo") and the preset itself, or undefined.
 */
export function detectBankPreset(
  headers: string[],
  fileNameHint = "",
): { key: string; preset: BankPreset } | undefined {
  const lowerFileName = fileNameHint.toLowerCase();

  // Header fingerprints: unique columns that identify each bank
  const HEADER_FINGERPRINTS: Array<{ key: string; uniqueHeaders: string[] }> = [
    { key: "monzo",     uniqueHeaders: ["Name", "Notes and #tags"] },
    { key: "starling",  uniqueHeaders: ["Counter Party", "Spending Category"] },
    { key: "revolut",   uniqueHeaders: ["Started Date", "Completed Date", "State"] },
    { key: "lloyds",    uniqueHeaders: ["Transaction Date", "Debit Amount", "Credit Amount"] },
    { key: "halifax",   uniqueHeaders: ["Transaction Date", "Debit Amount", "Credit Amount"] },
    { key: "hsbc",      uniqueHeaders: ["Debit", "Credit", "Balance"] },
    { key: "natwest",   uniqueHeaders: ["Value", "Account Name", "Account Number"] },
    { key: "rbs",       uniqueHeaders: ["Value", "Account Name", "Account Number"] },
    { key: "paypal",    uniqueHeaders: ["TimeZone", "Gross", "Net", "From Email Address"] },
    { key: "amex",      uniqueHeaders: ["Reference", "Amount", "Description"] },
    { key: "barclays",  uniqueHeaders: ["Subcategory", "Memo"] },
    { key: "santander", uniqueHeaders: ["Description", "Amount", "Balance"] },
  ];

  const headerSet = new Set(headers);

  // 1. Try header fingerprint matching (most reliable)
  for (const { key, uniqueHeaders } of HEADER_FINGERPRINTS) {
    const matchCount = uniqueHeaders.filter((h) => headerSet.has(h)).length;
    if (matchCount >= Math.ceil(uniqueHeaders.length * 0.6)) {
      const preset = BANK_PRESETS[key];
      if (preset) return { key, preset };
    }
  }

  // 2. Fall back to filename hint
  const fileNameMap: Record<string, string> = {
    monzo: "monzo", starling: "starling", revolut: "revolut",
    barclays: "barclays", lloyds: "lloyds", hsbc: "hsbc",
    natwest: "natwest", halifax: "halifax", santander: "santander",
    paypal: "paypal", amex: "amex", "american express": "amex", rbs: "rbs",
  };
  for (const [keyword, key] of Object.entries(fileNameMap)) {
    if (lowerFileName.includes(keyword)) {
      const preset = BANK_PRESETS[key];
      if (preset) return { key, preset };
    }
  }

  return undefined;
}

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
  preset?: BankPreset,
) {
  // Apply preset status filter if specified (e.g. PayPal: only "Completed" rows)
  const filteredRecords = preset?.statusFilter
    ? parsed.records.filter((r) => {
        const val = String(r[preset.statusFilter!.column] ?? "").trim();
        return val === preset.statusFilter!.value;
      })
    : parsed.records;

  return filteredRecords.map<TransactionRecord>((record, index) => {
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

    // Debit/credit split: credit is positive (money in), debit is negative (money out)
    let resolvedAmount: number;
    if (preset?.debitColumn || preset?.creditColumn) {
      const debit = toNumber(record[preset?.debitColumn ?? ""] ?? 0);
      const credit = toNumber(record[preset?.creditColumn ?? ""] ?? 0);
      resolvedAmount = credit - debit; // positive = money in, negative = money out
    } else {
      resolvedAmount = toNumber(amountValue);
    }

    return {
      id: `txn_import_${index + 1}_${slugify(String(referenceValue || descriptionValue || merchantValue || index))}`,
      sourceLineNumber: index + 2,
      transactionDate: toDateString(dateValue),
      amount: resolvedAmount,
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

/**
 * Detects file type by extension/content and routes to the correct parser.
 * Returns parsed transactions directly (no column mapping needed for OFX/QIF).
 * Returns null for CSV/Excel (use parseTransactionFile + mapTransactions instead).
 */
export async function parseNativeFormat(
  buffer: ArrayBuffer,
  fileName: string,
  fallbackCurrency = "GBP",
): Promise<TransactionRecord[] | null> {
  const lower = fileName.toLowerCase();
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);

  if (lower.endsWith(".ofx") || lower.endsWith(".qfx") || text.includes("<OFX>") || text.includes("<ofx>")) {
    const { parseOFX } = await import("./ofx-parser");
    return parseOFX(text, fallbackCurrency);
  }

  if (lower.endsWith(".qif") || text.startsWith("!Type:")) {
    const { parseQIF } = await import("./qif-parser");
    return parseQIF(text, fallbackCurrency);
  }

  return null; // CSV/Excel — use the existing flow
}
