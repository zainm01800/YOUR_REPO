import type { TransactionRecord } from "@/lib/domain/types";
import { slugify } from "@/lib/utils";

function parseQIFDate(value: string): string | undefined {
  // QIF date formats: MM/DD/YYYY, MM/DD/YY, D/M/YYYY, D/M'YYYY (Quicken UK)
  const cleaned = value.replace(/'/g, "/").replace(/-/g, "/").trim();
  const parts = cleaned.split("/").map((p) => parseInt(p.trim(), 10));
  if (parts.length !== 3 || parts.some(isNaN)) return undefined;
  let [a, b, year] = parts;
  if (year < 100) year += year < 30 ? 2000 : 1900;
  // Detect DD/MM vs MM/DD: if first part > 12, it must be the day
  const [month, day] = a > 12 ? [b, a] : [a, b];
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Parses a QIF (Quicken Interchange Format) file.
 * Handles Bank, CCard, and Cash account types.
 */
export function parseQIF(content: string, fallbackCurrency = "GBP"): TransactionRecord[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const transactions: TransactionRecord[] = [];
  let current: {
    date?: string; amount?: number; payee?: string; memo?: string; reference?: string;
  } = {};
  let index = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("!")) continue; // skip empty lines and account type headers

    const type = line[0];
    const value = line.slice(1).trim();

    switch (type) {
      case "D": current.date = parseQIFDate(value); break;
      case "T":
      case "U": {
        const amount = parseFloat(value.replace(/,/g, "").replace(/\s/g, ""));
        if (isFinite(amount)) current.amount = amount;
        break;
      }
      case "P": current.payee = value; break;
      case "M": current.memo = value; break;
      case "N": current.reference = value; break;
      case "^": {
        if (current.amount !== undefined) {
          const merchant = current.payee || current.memo || "Unknown";
          transactions.push({
            id: `txn_qif_${index + 1}_${slugify(current.reference || current.payee || String(index))}`,
            sourceLineNumber: index + 2,
            transactionDate: current.date,
            amount: current.amount,
            currency: fallbackCurrency,
            merchant,
            description: current.memo || current.payee || "",
            reference: current.reference,
          });
          index++;
        }
        current = {};
        break;
      }
    }
  }

  return transactions;
}
