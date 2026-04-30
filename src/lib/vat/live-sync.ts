import { randomUUID } from "node:crypto";
import type { VatRule } from "@/lib/domain/types";

const euTedbCountryCodes = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "EL",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
] as const;

type LiveVatSyncSummary = {
  syncedAt: string;
  sourceSummary: string[];
  countries: string[];
  rules: VatRule[];
};

function mapTedbCountryCodeToAppCountryCode(countryCode: string) {
  return countryCode === "EL" ? "GR" : countryCode;
}

function normalizeCountryCode(countryCode: string) {
  return countryCode.trim().toUpperCase();
}

function buildTaxCode(countryCode: string, rate: number) {
  const rateCode = rate.toFixed(2).replace(/(\.\d*?[1-9])0+$|\.0+$/u, "$1").replace(".", "");
  return `${countryCode}${rateCode}`;
}

function buildGovUkRule(rate: number, description: string): VatRule {
  return {
    id: `vat_sync_${randomUUID()}`,
    countryCode: "GB",
    rate,
    taxCode: buildTaxCode("GB", rate),
    recoverable: true,
    description,
  };
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Zentra VAT Sync/1.0",
      Accept: "text/html, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchUkVatRules() {
  const html = await fetchText("https://www.gov.uk/vat-rates");
  const patterns = [
    {
      pattern:
        /Standard rate(?:\\u003c\/th\\u003e|<\/th>)[\s\S]{0,120}?(?:\\u003ctd\\u003e|<td>)([0-9.]+)%/i,
      description: "UK standard rate (synced from GOV.UK)",
    },
    {
      pattern:
        /Reduced rate(?:\\u003c\/th\\u003e|<\/th>)[\s\S]{0,120}?(?:\\u003ctd\\u003e|<td>)([0-9.]+)%/i,
      description: "UK reduced rate (synced from GOV.UK)",
    },
    {
      pattern:
        /Zero rate(?:\\u003c\/th\\u003e|<\/th>)[\s\S]{0,120}?(?:\\u003ctd\\u003e|<td>)([0-9.]+)%/i,
      description: "UK zero rate (synced from GOV.UK)",
    },
  ];

  const rules = patterns
    .map((candidate) => {
      const match = html.match(candidate.pattern);
      if (!match) {
        return undefined;
      }

      return buildGovUkRule(Number(match[1]), candidate.description);
    })
    .filter((candidate): candidate is VatRule => Boolean(candidate));

  if (rules.length === 0) {
    throw new Error("Could not extract UK VAT rates from GOV.UK.");
  }

  return rules;
}

function buildTedbEnvelope() {
  const isoCodes = euTedbCountryCodes
    .map((countryCode) => `<typ:isoCode>${countryCode}</typ:isoCode>`)
    .join("");

  const today = new Date().toISOString().slice(0, 10);

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="urn:ec.europa.eu:taxud:tedb:services:v1:IVatRetrievalService" xmlns:typ="urn:ec.europa.eu:taxud:tedb:services:v1:IVatRetrievalService:types">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:retrieveVatRatesReqMsg>
      <typ:memberStates>${isoCodes}</typ:memberStates>
      <typ:situationOn>${today}</typ:situationOn>
    </ser:retrieveVatRatesReqMsg>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function extractTagValue(block: string, tagName: string) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"));
  return match?.[1]?.trim();
}

async function fetchEuVatRulesFromTedb() {
  const response = await fetch("https://ec.europa.eu/taxation_customs/tedb/ws/VatRetrievalService", {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction:
        "urn:ec.europa.eu:taxud:tedb:services:v1:VatRetrievalService/RetrieveVatRates",
    },
    body: buildTedbEnvelope(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`TEDB VAT sync failed with status ${response.status}.`);
  }

  const xml = await response.text();
  const blocks = [...xml.matchAll(/<vatRateResults>([\s\S]*?)<\/vatRateResults>/g)].map(
    (match) => match[1],
  );
  const rawEntries: Array<{
    countryCode: string;
    outerType: string;
    rateType?: string;
    rate: number;
  }> = [];

  for (const block of blocks) {
    if (
      block.includes("<cnCodes>") ||
      block.includes("<cpaCodes>") ||
      block.includes("<category>")
    ) {
      continue;
    }

    const sourceCountryCode = extractTagValue(block, "memberState");
    const outerType = extractTagValue(block, "type");
    const rateType = block.match(/<rate>\s*<type>([\s\S]*?)<\/type>/i)?.[1]?.trim();
    const value = extractTagValue(block, "value");

    if (!sourceCountryCode || !value) {
      continue;
    }

    const parsedRate = Number(value);
    if (!Number.isFinite(parsedRate)) {
      continue;
    }

    const countryCode = mapTedbCountryCodeToAppCountryCode(sourceCountryCode);
    const normalizedCountryCode = normalizeCountryCode(countryCode);
    const normalizedRate = Number(parsedRate.toFixed(2));
    rawEntries.push({
      countryCode: normalizedCountryCode,
      outerType: outerType || "REDUCED",
      rateType: rateType || undefined,
      rate: normalizedRate,
    });
  }

  const byCountry = new Map<string, typeof rawEntries>();
  for (const entry of rawEntries) {
    const existing = byCountry.get(entry.countryCode) || [];
    existing.push(entry);
    byCountry.set(entry.countryCode, existing);
  }

  const deduped = new Map<string, VatRule>();

  for (const [countryCode, entries] of byCountry.entries()) {
    const standardRate = entries
      .filter((entry) => entry.outerType === "STANDARD")
      .reduce<number | undefined>(
        (highestRate, entry) =>
          highestRate === undefined || entry.rate > highestRate ? entry.rate : highestRate,
        undefined,
      );

    if (standardRate !== undefined) {
      const key = `${countryCode}:${standardRate}`;
      deduped.set(key, {
        id: `vat_sync_${randomUUID()}`,
        countryCode,
        rate: standardRate,
        taxCode: buildTaxCode(countryCode, standardRate),
        recoverable: true,
        description: `${countryCode} standard VAT rate (synced from EU TEDB)`,
      });
    }

    const reducedEntries = entries.filter((entry) => {
      if (entry.outerType !== "REDUCED") {
        return false;
      }

      if (standardRate !== undefined && entry.rate >= standardRate) {
        return false;
      }

      return true;
    });

    for (const entry of reducedEntries) {
      const key = `${countryCode}:${entry.rate}`;
      if (deduped.has(key)) {
        continue;
      }

      const rateTypeLabel =
        entry.rateType === "PARKING_RATE"
          ? "parking"
          : entry.rateType === "SUPER_REDUCED_RATE"
            ? "super reduced"
            : "reduced";
      deduped.set(key, {
        id: `vat_sync_${randomUUID()}`,
        countryCode,
        rate: entry.rate,
        taxCode: buildTaxCode(countryCode, entry.rate),
        recoverable: true,
        description: `${countryCode} ${rateTypeLabel} VAT rate (synced from EU TEDB)`,
      });
    }
  }

  return [...deduped.values()];
}

export async function syncLiveVatRules(): Promise<LiveVatSyncSummary> {
  const [ukRules, euRules] = await Promise.all([fetchUkVatRules(), fetchEuVatRulesFromTedb()]);
  const rules = [...ukRules, ...euRules].sort((left, right) => {
    if (left.countryCode === right.countryCode) {
      return left.rate - right.rate;
    }

    return left.countryCode.localeCompare(right.countryCode);
  });

  return {
    syncedAt: new Date().toISOString(),
    sourceSummary: [
      "UK rates synced from GOV.UK",
      "EU rates synced from European Commission TEDB",
    ],
    countries: [...new Set(rules.map((rule) => rule.countryCode))],
    rules,
  };
}
