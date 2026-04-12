/** In-process cache so we don't hit Frankfurter on every request during a session. */
interface RateCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let _cache: RateCache | null = null;

/**
 * Fetch exchange rates from the Frankfurter API (ECB data, no API key needed).
 * Returns a map of { [foreignCurrency]: unitsPerOneBase }.
 * e.g. base=GBP → { USD: 1.26, EUR: 1.17, ... }  meaning 1 GBP = 1.26 USD
 * To convert foreignAmount → base: foreignAmount / rates[foreignCurrency]
 */
export async function getFxRates(
  baseCurrency: string,
): Promise<Record<string, number>> {
  const now = Date.now();

  if (
    _cache &&
    _cache.base === baseCurrency &&
    now - _cache.fetchedAt < CACHE_TTL_MS
  ) {
    return _cache.rates;
  }

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?base=${baseCurrency}`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!res.ok) {
      return {};
    }

    const data = (await res.json()) as { rates: Record<string, number> };
    _cache = { base: baseCurrency, rates: data.rates, fetchedAt: now };
    return data.rates;
  } catch {
    return {};
  }
}

/**
 * Convert an amount from one currency to another.
 * `rates` must be relative to `toCurrency` (i.e. fetched with base=toCurrency).
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number | undefined {
  if (!fromCurrency || !toCurrency) return undefined;
  if (fromCurrency === toCurrency) return amount;

  const rate = rates[fromCurrency];
  if (!rate) return undefined;

  // rates[fromCurrency] = how many fromCurrency per 1 toCurrency
  // so: amount in toCurrency = amount / rate
  return Math.round((amount / rate) * 100) / 100;
}
