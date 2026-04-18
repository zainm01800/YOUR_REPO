export type AnomalySeverity = "warning" | "info";

export interface AnomalyInfo {
  reason: string;
  severity: AnomalySeverity;
  expectedAvg: number;
  currency: string;
}

const NOISE = new Set([
  "bacs", "chaps", "faster", "payment", "payments", "transfer", "direct",
  "debit", "credit", "standing", "order", "refund", "receipt", "salary",
  "from", "via", "for", "ref", "reference", "invoice", "number", "date",
  "ltd", "limited", "plc", "inc", "llp", "llc", "corp", "group", "services",
  "uk", "gb", "eur", "europe", "the", "and",
]);

function primaryToken(merchant: string): string {
  return (
    merchant
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .find((t) => t.length >= 4 && !/^\d+$/.test(t) && !NOISE.has(t)) ?? ""
  );
}

function avg(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums: number[], mean: number) {
  return Math.sqrt(nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length);
}

/**
 * Detects anomalous transaction amounts per merchant.
 * Groups transactions by primary merchant token, computes mean + std dev,
 * and flags anything with z-score > 2 (roughly: more than 2× the normal spread).
 * Requires at least 3 transactions per merchant to flag anything.
 */
export function detectAnomalies(
  transactions: { id: string; merchant: string; amount: number; currency: string }[],
): Map<string, AnomalyInfo> {
  // Group absolute amounts by primary merchant token
  const groups = new Map<string, { amounts: number[]; currency: string }>();

  for (const tx of transactions) {
    const token = primaryToken(tx.merchant);
    if (!token) continue;
    if (!groups.has(token)) groups.set(token, { amounts: [], currency: tx.currency ?? "GBP" });
    groups.get(token)!.amounts.push(Math.abs(tx.amount));
  }

  const result = new Map<string, AnomalyInfo>();

  for (const tx of transactions) {
    const token = primaryToken(tx.merchant);
    if (!token) continue;

    const group = groups.get(token);
    if (!group || group.amounts.length < 3) continue;

    const mean = avg(group.amounts);
    const sd = stdDev(group.amounts, mean);
    if (sd < 0.01) continue; // all identical — nothing to flag

    const amt = Math.abs(tx.amount);
    const z = Math.abs(amt - mean) / sd;
    if (z < 2) continue;

    const isHigh = amt > mean;
    const ratio = (amt / mean).toFixed(1);

    result.set(tx.id, {
      reason: isHigh
        ? `${ratio}× higher than usual for this merchant`
        : `${ratio}× lower than usual for this merchant`,
      severity: z > 3 ? "warning" : "info",
      expectedAvg: mean,
      currency: group.currency,
    });
  }

  return result;
}
