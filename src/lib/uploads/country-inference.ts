export function normalizeCountryCode(countryCode?: string | null) {
  return countryCode?.trim().toUpperCase();
}

export function inferCountryCodeFromTextOrCurrency(
  rawText: string,
  currency?: string | null,
  aiCountryCode?: string | null,
) {
  const normalizedAiCountryCode = normalizeCountryCode(aiCountryCode);
  if (normalizedAiCountryCode) {
    return normalizedAiCountryCode;
  }

  const text = rawText.toUpperCase();
  const countryHints: Array<[RegExp, string]> = [
    [/\bUNITED KINGDOM\b|\bUK\b|\bGREAT BRITAIN\b/, "GB"],
    [/\bUNITED STATES\b|\bUSA\b|\bU\.S\.\b/, "US"],
    [/\bAUSTRALIA\b/, "AU"],
    [/\bGERMANY\b|\bDEUTSCHLAND\b/, "DE"],
    [/\bFRANCE\b/, "FR"],
    [/\bSPAIN\b|\bESPAÑA\b/, "ES"],
    [/\bITALY\b|\bITALIA\b/, "IT"],
    [/\bIRELAND\b/, "IE"],
    [/\bNETHERLANDS\b/, "NL"],
    [/\bBELGIUM\b/, "BE"],
    [/\bCANADA\b/, "CA"],
    [/\bNEW ZEALAND\b/, "NZ"],
    [/\bSWITZERLAND\b/, "CH"],
    [/\bNORWAY\b/, "NO"],
  ];

  for (const [pattern, countryCode] of countryHints) {
    if (pattern.test(text)) {
      return countryCode;
    }
  }

  switch ((currency ?? "").toUpperCase()) {
    case "GBP":
      return "GB";
    case "USD":
      return "US";
    case "AUD":
      return "AU";
    case "CAD":
      return "CA";
    case "NZD":
      return "NZ";
    case "CHF":
      return "CH";
    case "SEK":
      return "SE";
    case "NOK":
      return "NO";
    case "DKK":
      return "DK";
    case "PLN":
      return "PL";
    default:
      return undefined;
  }
}
