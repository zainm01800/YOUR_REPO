import type {
  ExtractedDocument,
  RunRowException,
  VatRule,
} from "@/lib/domain/types";
import { normalizeCountryCode } from "@/lib/uploads/country-inference";

export function isVatClaimableForRun(
  document: ExtractedDocument | undefined,
  runCountryCode?: string,
) {
  const normalizedRunCountryCode = normalizeCountryCode(runCountryCode);
  const normalizedDocumentCountryCode = normalizeCountryCode(document?.countryCode);

  if (!document) {
    return true;
  }

  if (normalizedRunCountryCode && normalizedDocumentCountryCode) {
    return normalizedRunCountryCode === normalizedDocumentCountryCode;
  }

  // Conservative fallback: if we cannot determine the invoice country at all,
  // treat VAT as non-claimable until finance confirms the location.
  if (normalizedRunCountryCode && normalizedDocumentCountryCode === undefined) {
    return false;
  }

  if (!normalizedRunCountryCode || !normalizedDocumentCountryCode) {
    return true;
  }

  return normalizedRunCountryCode === normalizedDocumentCountryCode;
}

export function getForeignVatNonClaimableException(
  document: ExtractedDocument | undefined,
  runCountryCode?: string,
) {
  const hasRecoverableVatToSuppress =
    (document?.vat ?? 0) > 0 ||
    (document?.taxLines ?? []).some((taxLine) => taxLine.taxAmount > 0 || taxLine.rate > 0);

  if (
    isVatClaimableForRun(document, runCountryCode) ||
    !hasRecoverableVatToSuppress
  ) {
    return undefined;
  }

  const documentLocationLabel =
    normalizeCountryCode(document?.countryCode) ??
    (document?.currency ? `${document.currency.toUpperCase()} invoice` : "unknown-country invoice");
  const isUnknownCountry = normalizeCountryCode(document?.countryCode) === undefined;

  return {
    code: "foreign_vat_not_claimable" as const,
    severity: isUnknownCountry ? ("high" as const) : ("medium" as const),
    message: isUnknownCountry
      ? `Invoice country could not be determined, so VAT is treated as non-claimable until reviewed for run country ${normalizeCountryCode(runCountryCode)}.`
      : `${documentLocationLabel} differs from run country ${normalizeCountryCode(runCountryCode)}, so VAT is treated as non-claimable.`,
  };
}

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

  const normalizedDocumentCountryCode = normalizeCountryCode(document.countryCode);

  if (!normalizedDocumentCountryCode && document.taxLines.some((taxLine) => taxLine.rate > 0)) {
    exceptions.push({
      code: "suspicious_vat_rate",
      severity: "medium",
      message: "Invoice country is unknown, so VAT rates could not be validated against workspace rules.",
    });
    return exceptions;
  }

  const unmatchedRate = document.taxLines.find((taxLine) => {
    return !vatRules.some(
      (rule) =>
        rule.countryCode === normalizedDocumentCountryCode &&
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
  const normalizedDocumentCountryCode = normalizeCountryCode(document.countryCode);
  if (primaryRate === undefined) {
    return undefined;
  }

  if (!normalizedDocumentCountryCode) {
    return undefined;
  }

  return vatRules.find(
    (rule) =>
      rule.countryCode === normalizedDocumentCountryCode &&
      Math.abs(rule.rate - primaryRate) < 0.001,
  )?.taxCode;
}
