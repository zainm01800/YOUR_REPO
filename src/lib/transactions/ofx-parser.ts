import type { TransactionRecord } from "@/lib/domain/types";
import { slugify } from "@/lib/utils";

function extractTag(content: string, tag: string): string | undefined {
  // Handles both <TAG>value and <TAG>value</TAG> formats
  const regex = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i");
  return content.match(regex)?.[1]?.trim() || undefined;
}

function parseOFXDate(value?: string): string | undefined {
  if (!value) return undefined;
  // OFX date: YYYYMMDD[HHMMSS[.mmm]][±hh:mm][bracket timezone]
  const cleaned = value.split("[")[0].split(".")[0];
  if (cleaned.length >= 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }
  return undefined;
}

/**
 * Parses an OFX/QFX file (SGML or XML format) into TransactionRecords.
 * Works with exports from most UK banks, Quicken, and YNAB.
 */
export function parseOFX(content: string, fallbackCurrency = "GBP"): TransactionRecord[] {
  const currency = extractTag(content, "CURDEF") || fallbackCurrency;

  // Match individual transaction blocks — handles both <STMTTRN>...</STMTTRN> and unclosed SGML
  const trnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>))/gi;
  const transactions: TransactionRecord[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = trnRegex.exec(content)) !== null) {
    const block = match[1];
    if (!block.trim()) continue;

    const trnType = extractTag(block, "TRNTYPE") || "";
    const dtPosted = parseOFXDate(extractTag(block, "DTPOSTED") ?? extractTag(block, "DTUSER"));
    const rawAmt = extractTag(block, "TRNAMT");
    const fitId = extractTag(block, "FITID");
    const name = extractTag(block, "NAME");
    const memo = extractTag(block, "MEMO");
    const checkNum = extractTag(block, "CHECKNUM");

    if (!rawAmt) continue;
    const amount = parseFloat(rawAmt.replace(",", ""));
    if (!isFinite(amount)) continue;

    const merchant = name || memo || trnType || "Unknown";
    const description = [memo, name].filter(Boolean).join(" — ") || trnType;

    transactions.push({
      id: `txn_ofx_${index + 1}_${slugify(fitId || description || String(index))}`,
      sourceLineNumber: index + 2,
      externalId: fitId,
      transactionDate: dtPosted,
      amount,
      currency,
      merchant,
      description,
      reference: checkNum || fitId,
    });
    index++;
  }

  return transactions;
}
