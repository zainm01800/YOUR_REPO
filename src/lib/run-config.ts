import type { CountryOption } from "@/lib/domain/types";

export const runPresetStorageKey = "zentra-run-presets";

export const europeanCountryOptions: CountryOption[] = [
  { code: "GB", label: "United Kingdom", currency: "GBP" },
  { code: "AT", label: "Austria", currency: "EUR" },
  { code: "BE", label: "Belgium", currency: "EUR" },
  { code: "BG", label: "Bulgaria", currency: "BGN" },
  { code: "HR", label: "Croatia", currency: "EUR" },
  { code: "CY", label: "Cyprus", currency: "EUR" },
  { code: "CZ", label: "Czechia", currency: "CZK" },
  { code: "DK", label: "Denmark", currency: "DKK" },
  { code: "EE", label: "Estonia", currency: "EUR" },
  { code: "FI", label: "Finland", currency: "EUR" },
  { code: "FR", label: "France", currency: "EUR" },
  { code: "DE", label: "Germany", currency: "EUR" },
  { code: "GR", label: "Greece", currency: "EUR" },
  { code: "HU", label: "Hungary", currency: "HUF" },
  { code: "IE", label: "Ireland", currency: "EUR" },
  { code: "IT", label: "Italy", currency: "EUR" },
  { code: "LV", label: "Latvia", currency: "EUR" },
  { code: "LT", label: "Lithuania", currency: "EUR" },
  { code: "LU", label: "Luxembourg", currency: "EUR" },
  { code: "MT", label: "Malta", currency: "EUR" },
  { code: "NL", label: "Netherlands", currency: "EUR" },
  { code: "PL", label: "Poland", currency: "PLN" },
  { code: "PT", label: "Portugal", currency: "EUR" },
  { code: "RO", label: "Romania", currency: "RON" },
  { code: "SK", label: "Slovakia", currency: "EUR" },
  { code: "SI", label: "Slovenia", currency: "EUR" },
  { code: "ES", label: "Spain", currency: "EUR" },
  { code: "SE", label: "Sweden", currency: "SEK" },
];

export const supportedCurrencies = [
  "GBP",
  "EUR",
  "USD",
  "BGN",
  "CZK",
  "DKK",
  "HUF",
  "PLN",
  "RON",
  "SEK",
];

export function getDefaultCurrencyForCountry(countryCode: string) {
  return (
    europeanCountryOptions.find((country) => country.code === countryCode)?.currency ??
    "EUR"
  );
}
