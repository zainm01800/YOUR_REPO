import type {
  ExtractedDocument,
  RunRowException,
  VatRule,
} from "@/lib/domain/types";

export function detectVatExceptions(
  document: ExtractedDocument | undefined,
  vatRules: VatRule[],
  tolerance = 1.5,
) {
  const exceptions: RunRowException[] = [];

  if (!document) {
    return exceptions;
  }

  if (
    document.net !== undefined &&
    document.vat !== undefined &&
    document.gross !== undefined
  ) {
    const variance = Math.abs(document.net + document.vat - document.gross);
    if (variance > tolerance) {
      exceptions.push({
        code: "gross_formula_break",
        severity: "high",
        message: "Net plus VAT does not reconcile back to the gross amount.",
      });
    }
  }

  const unmatchedRate = document.taxLines.find((taxLine) => {
    return !vatRules.some(
      (rule) =>
        rule.countryCode === (document.countryCode || "GB") &&
        Math.abs(rule.rate - taxLine.rate) < 0.001,
    );
  });

  if (unmatchedRate) {
    exceptions.push({
      code: "suspicious_vat_rate",
      severity: "medium",
      message: `No workspace VAT rule matches ${unmatchedRate.rate.toFixed(1)}%.`,
    });
  }

  return exceptions;
}

export function resolveVatCode(
  document: ExtractedDocument | undefined,
  vatRules: VatRule[],
  rateOverride?: number,
) {
  if (!document) {
    return undefined;
  }

  const primaryRate = rateOverride ?? document.taxLines[0]?.rate;
  if (primaryRate === undefined) {
    return undefined;
  }

  return vatRules.find(
    (rule) =>
      rule.countryCode === (document.countryCode || "GB") &&
      Math.abs(rule.rate - primaryRate) < 0.001,
  )?.taxCode;
}
