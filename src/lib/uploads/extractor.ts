import { PDFParse } from "pdf-parse";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ClientExtractedDocumentInput,
  DocumentTaxLine,
  ExtractedDocument,
} from "@/lib/domain/types";
import {
  inferCountryCodeFromTextOrCurrency,
} from "@/lib/uploads/country-inference";

interface AiTaxLine {
  label?: string | null;
  rate?: number | null;
  netAmount?: number | null;
  taxAmount?: number | null;
  grossAmount?: number | null;
}

interface AiExtractedFields {
  supplier: string | null;
  issueDate: string | null;
  gross: number | null;
  net: number | null;
  vat: number | null;
  currency: string | null;
  countryCode?: string | null;
  taxLines?: AiTaxLine[] | null;
}

const GROQ_SYSTEM_PROMPT = `You are a financial document parser. Extract key fields from invoice/receipt text.

Return ONLY valid JSON - no markdown, no explanation:
{"supplier":"string","issueDate":"YYYY-MM-DD or null","gross":number_or_null,"net":number_or_null,"vat":number_or_null,"currency":"3-letter ISO code","countryCode":"2-letter ISO country code or null","taxLines":[{"label":"string","rate":number,"netAmount":number_or_null,"taxAmount":number_or_null,"grossAmount":number_or_null}]}

Definitions:
- supplier: the vendor / seller company name (who is billing, not who is being billed)
- gross: the final total the buyer must pay, including all taxes
- net: the subtotal before tax
- vat: the total tax amount
- taxLines: one object per VAT/tax rate shown on the document. If multiple rates exist, return multiple entries.

Critical rules:
- NEVER use a date component as a money value.
- If the receipt shows VAT summary lines like "VAT 20% of 8.00 1.60", return them as taxLines.
- If the invoice shows multiple tax rates, keep them separate.
- If a 0% line is implied by the subtotal but not explicitly repeated in the summary, include it when you can derive it safely.
- gross should equal the sum of tax line gross amounts when taxLines are present.
- If only a total is visible with no breakdown, set taxLines to [].
- countryCode: extract the seller or invoice country when visible using ISO-2 like GB, US, AU, DE, FR.
- currency: infer from GBP/£, USD/$, EUR/euro symbol. Default GBP.`;

const GEMINI_VISION_PROMPT = `Extract financial invoice or receipt fields from this image or PDF and return ONLY valid JSON:
{"supplier":"vendor company name","issueDate":"YYYY-MM-DD or null","gross":number_or_null,"net":number_or_null,"vat":number_or_null,"currency":"GBP/USD/EUR/AUD etc","countryCode":"ISO-2 seller country code or null","taxLines":[{"label":"string","rate":number,"netAmount":number_or_null,"taxAmount":number_or_null,"grossAmount":number_or_null}]}

Rules:
- gross = final total payable
- net = subtotal before tax
- vat = total tax amount
- taxLines = one entry per distinct VAT/tax rate
- if the document includes VAT summary lines, preserve each rate separately
- include 0% lines when shown or safely implied by subtotal
- supplier is the seller, not the buyer
- countryCode is the seller or invoice country when visible`;

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function parseLooseMoneyToken(value: string) {
  const normalized = value.replace(/[^0-9.,-]/g, "");
  if (!normalized) {
    return undefined;
  }

  if (/[.,]/.test(normalized)) {
    const candidate = normalized.replace(/,/g, ".");
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  const digits = normalized.replace(/\D/g, "");
  if (!digits) {
    return undefined;
  }

  const parsed = Number(digits);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  // OCR often drops the decimal separator on VAT summary lines like 60.00 -> 6000.
  if (digits.length >= 4) {
    return parsed / 100;
  }

  return parsed;
}

function toMoney(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replace(/[, ]/g, "").replace(/[£$EURGBPUSD]/gi, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function extractWithGroq(rawText: string): Promise<AiExtractedFields | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here" || rawText.trim().length < 20) {
    return null;
  }

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: GROQ_SYSTEM_PROMPT },
        { role: "user", content: rawText.slice(0, 6000) },
      ],
      temperature: 0,
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    return JSON.parse(jsonMatch[0]) as AiExtractedFields;
  } catch {
    return null;
  }
}

async function extractWithGroqVision(
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<AiExtractedFields | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    return null;
  }

  const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!supportedTypes.includes(mimeType)) {
    return null;
  }

  try {
    const groq = new Groq({ apiKey });
    const base64 = Buffer.from(buffer).toString("base64");
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user" as const,
          content: [
            {
              type: "image_url" as const,
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            {
              type: "text" as const,
              text: `${GROQ_SYSTEM_PROMPT}\n\nExtract invoice fields from this image and return only valid JSON.`,
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    return JSON.parse(jsonMatch[0]) as AiExtractedFields;
  } catch (err) {
    console.error("[extractor] Groq Vision failed:", err);
    return null;
  }
}

async function extractWithGeminiVision(
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<AiExtractedFields | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return null;
  }

  const supportedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!supportedTypes.includes(mimeType)) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const base64 = Buffer.from(buffer).toString("base64");
    const result = await model.generateContent([
      GEMINI_VISION_PROMPT,
      { inlineData: { mimeType, data: base64 } },
    ]);

    const raw = result.response.text().trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    return JSON.parse(jsonMatch[0]) as AiExtractedFields;
  } catch {
    return null;
  }
}

function findMoneyValues(text: string): number[] {
  // Remove date-like patterns so they don't get picked up as amounts
  const stripped = text.replace(/\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/g, "");

  const found = new Set<number>();

  // Primary: numbers with exactly 2 decimal places (e.g. 240.00, 1,200.00)
  for (const match of stripped.matchAll(/(?:^|[\s£$€,]|\b)(\d{1,6}[.,]\d{2})(?:\b|$)/gm)) {
    const value = Number(match[1].replace(",", "."));
    if (value > 0 && value < 1_000_000) found.add(value);
  }

  // Secondary: integers immediately preceded by a currency symbol (e.g. £240, $100)
  for (const match of stripped.matchAll(/[£$€]\s*(\d{2,6})(?!\s*[.,]\d)/g)) {
    const value = Number(match[1]);
    if (value > 0 && value < 1_000_000) found.add(value);
  }

  // Tertiary: integers followed by a currency code (e.g. 240 GBP, 100 USD)
  for (const match of stripped.matchAll(/(\d{2,6})\s*(?:GBP|USD|EUR|AUD)\b/gi)) {
    const value = Number(match[1]);
    if (value > 0 && value < 1_000_000) found.add(value);
  }

  return Array.from(found);
}

/**
 * Look for explicitly labelled total amounts — the most reliable signal when
 * the document has a "Total", "Grand Total", "Amount Due", etc. line.
 */
function findTotalAmount(text: string): number | undefined {
  const patterns = [
    /total\s+with\s+vat[^0-9]*?([£$€]?\s*\d{1,6}[.,]\d{2})/i,
    /total\s+inc(?:l(?:uding)?)?\s*(?:vat|tax)[^0-9]*?([£$€]?\s*\d{1,6}[.,]\d{2})/i,
    /amount\s+due[^0-9]*?([£$€]?\s*\d{1,6}[.,]\d{2})/i,
    /grand\s+total[^0-9]*?([£$€]?\s*\d{1,6}[.,]\d{2})/i,
    /invoice\s+total[^0-9]*?([£$€]?\s*\d{1,6}[.,]\d{2})/i,
    /total\s+payable[^0-9]*?([£$€]?\s*\d{1,6}[.,]\d{2})/i,
    /(?:^|\n)\s*total[^a-z\n]*?([£$€]?\s*\d{1,6}[.,]\d{2})/im,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1]
        .replace(/[£$€\s]/g, "")        // strip symbols/spaces only
        .replace(/,(\d{2})$/, ".$1")     // comma-decimal "55,00" → "55.00"
        .replace(/,/g, "");              // strip remaining thousand-separator commas
      const value = Number(raw);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }

  return undefined;
}

function findCurrency(text: string): string {
  if (/\bAUD\b/.test(text)) return "AUD";
  if (/\bEUR\b|€/.test(text)) return "EUR";
  if (/\bGBP\b|£/.test(text)) return "GBP";
  if (/\bUSD\b|\$/.test(text)) return "USD";
  return "GBP";
}

function cleanSupplierCandidate(candidate: string) {
  return candidate
    .replace(/\s+[A-Z0-9&'.-]+\s+Buyer\b.*$/i, "")
    .replace(/\bClient'?s details\b.*$/i, "")
    .replace(/\bYour details\b.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function findSupplierFromText(rawText: string) {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const fromIndex = lines.findIndex((line) => /^from\b/i.test(line));
  if (fromIndex >= 0) {
    for (let index = fromIndex; index < Math.min(lines.length, fromIndex + 4); index += 1) {
      const line = lines[index];
      if (/^from\b/i.test(line) || /details/i.test(line) || /\d{5,}/.test(line)) {
        continue;
      }

      const candidate = cleanSupplierCandidate(line);
      if (candidate && /[A-Za-z]/.test(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

function findDate(text: string): string {
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const slash = text.match(/\b(\d{2})\/(\d{2})\/(20\d{2})\b/);
  if (slash) {
    return `${slash[3]}-${slash[2]}-${slash[1]}`;
  }

  const dot = text.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/);
  if (dot) {
    return `${dot[3]}-${dot[2].padStart(2, "0")}-${dot[1].padStart(2, "0")}`;
  }

  const monthName = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(20\d{2})\b/i,
  );
  if (monthName) {
    const monthIndex = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ].indexOf(monthName[1].toLowerCase());

    if (monthIndex >= 0) {
      return `${monthName[3]}-${String(monthIndex + 1).padStart(2, "0")}-${monthName[2].padStart(2, "0")}`;
    }
  }

  return new Date().toISOString().slice(0, 10);
}

function findExplicitNetSubtotal(text: string) {
  const patterns = [
    /subtotal without vat[^0-9]*?(\d{1,6}[.,]\d{2})/i,
    /subtotal[^0-9]*?(\d{1,6}[.,]\d{2})/i,
    /sub total[^0-9]*?(\d{1,6}[.,]\d{2})/i,
    /net amount[^0-9]*?(\d{1,6}[.,]\d{2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return Number(match[1].replace(",", "."));
    }
  }

  return undefined;
}

function parseSummaryTaxLinesFromText(rawText: string): AiTaxLine[] {
  const normalized = rawText.replace(/\r/g, "");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const taxLines: AiTaxLine[] = [];

  for (const line of lines) {
    const ofMatch = line.match(
      /VAT\s*\(?(\d+(?:[.,]\d+)?)%\)?\s*of\s*(\d{1,6}[.,]\d{2})\s*(\d{1,6}[.,]\d{2})/i,
    );
    if (ofMatch) {
      const rate = Number(ofMatch[1].replace(",", "."));
      const netAmount = Number(ofMatch[2].replace(",", "."));
      const taxAmount = Number(ofMatch[3].replace(",", "."));
      taxLines.push({
        label: `VAT ${rate}%`,
        rate,
        netAmount,
        taxAmount,
        grossAmount: roundMoney(netAmount + taxAmount),
      });
      continue;
    }

    const bracketMatch = line.match(
      /\(?(\d+(?:[.,]\d+)?)%\)?[^0-9]*(\d{1,8}(?:[.,]\d{2})?)$/i,
    );
    if (bracketMatch) {
      const rate = Number(bracketMatch[1].replace(",", "."));
      const taxAmount = parseLooseMoneyToken(bracketMatch[2]);
      if (taxAmount === undefined) {
        continue;
      }
      const netAmount = rate > 0 ? roundMoney(taxAmount / (rate / 100)) : undefined;
      taxLines.push({
        label: `VAT ${rate}%`,
        rate,
        netAmount,
        taxAmount,
        grossAmount:
          netAmount !== undefined ? roundMoney(netAmount + taxAmount) : undefined,
      });
    }
  }

  return taxLines;
}

function extractMentionedVatRates(rawText: string) {
  const rates = [
    ...rawText.matchAll(/VAT\s*\(?(\d+(?:[.,]\d+)?)%\)?/gi),
    ...rawText.matchAll(/(\d+(?:[.,]\d+)?)%\s*VAT/gi),
  ];

  return rates
    .map((match) => Number(match[1].replace(",", ".")))
    .filter((rate) => Number.isFinite(rate))
    .filter((rate, index, rates) => rates.findIndex((value) => Math.abs(value - rate) < 0.001) === index)
    .sort((a, b) => a - b);
}

function normaliseTaxLines(
  taxLines: AiTaxLine[] | undefined | null,
  totals: { gross?: number; net?: number; vat?: number },
  fileName: string,
  rawExtractedText: string,
): DocumentTaxLine[] {
  const normalized = (taxLines || [])
    .map((line, index) => {
      const rate = line.rate ?? 0;
      let netAmount = toMoney(line.netAmount);
      let taxAmount = toMoney(line.taxAmount);
      let grossAmount = toMoney(line.grossAmount);

      if (netAmount === undefined && taxAmount !== undefined && rate > 0) {
        netAmount = roundMoney(taxAmount / (rate / 100));
      }

      if (netAmount === undefined && grossAmount !== undefined) {
        netAmount = rate >= 0 ? roundMoney(grossAmount / (1 + rate / 100)) : undefined;
      }

      if (taxAmount === undefined && netAmount !== undefined) {
        taxAmount = roundMoney(netAmount * (rate / 100));
      }

      if (grossAmount === undefined && netAmount !== undefined && taxAmount !== undefined) {
        grossAmount = roundMoney(netAmount + taxAmount);
      }

      if (netAmount === undefined || taxAmount === undefined || grossAmount === undefined) {
        return null;
      }

      const normalizedLine: DocumentTaxLine = {
        id: `tax_${fileName}_${index}`,
        label: line.label?.trim() || `VAT ${rate}%`,
        netAmount,
        taxAmount,
        grossAmount,
        rate,
        recoverable: true,
      };

      return normalizedLine;
    })
    .filter((line): line is DocumentTaxLine => Boolean(line));

  if (normalized.length === 0) {
    const gross = totals.gross;
    const vat = totals.vat ?? 0;
    const net =
      totals.net !== undefined
        ? totals.net
        : gross !== undefined
          ? roundMoney(gross - vat)
          : undefined;

    if (gross !== undefined && net !== undefined) {
      normalized.push({
        id: `tax_${fileName}_0`,
        label: "Extracted",
        netAmount: net,
        taxAmount: vat,
        grossAmount: gross,
        rate: net > 0 ? roundMoney((vat / net) * 100) : 0,
        recoverable: true,
      });
    }
  }

  const mentionedRates = extractMentionedVatRates(rawExtractedText);
  const representedRates = normalized.map((line) => line.rate);
  let missingMentionedRates = mentionedRates.filter(
    (rate) => !representedRates.some((representedRate) => Math.abs(representedRate - rate) < 0.001),
  );

  if (totals.net !== undefined && totals.vat !== undefined) {
    const positiveRateLines = normalized.filter((line) => line.rate > 0.001);
    if (positiveRateLines.length === 1) {
      const taxLine = positiveRateLines[0];
      if (Math.abs(taxLine.taxAmount - totals.vat) > 0.01) {
        taxLine.taxAmount = roundMoney(totals.vat);
        taxLine.netAmount = roundMoney(totals.vat / (taxLine.rate / 100));
        taxLine.grossAmount = roundMoney(taxLine.netAmount + taxLine.taxAmount);
      }
    }

    const currentNet = roundMoney(
      normalized.reduce((sum, line) => sum + line.netAmount, 0),
    );
    const currentVat = roundMoney(
      normalized.reduce((sum, line) => sum + line.taxAmount, 0),
    );
    let residualNet = roundMoney(totals.net - currentNet);
    let residualVat = roundMoney(totals.vat - currentVat);
    const zeroRateLine = normalized.find(
      (line) => Math.abs(line.rate) < 0.001 && line.netAmount > 0.01,
    );

    if (missingMentionedRates.length === 0 && residualVat > 0.01) {
      const inferredRateBase =
        residualNet > 0.01
          ? residualNet
          : zeroRateLine?.netAmount;

      if (inferredRateBase && inferredRateBase > 0.01) {
        const inferredRate = roundMoney((residualVat / inferredRateBase) * 100);
        if (inferredRate > 0.01) {
          missingMentionedRates = [inferredRate];
        }
      }
    }

    if (residualVat > 0.01 && missingMentionedRates.length > 0) {
      for (const missingRate of missingMentionedRates) {
        if (residualVat <= 0.01) {
          break;
        }

        let inferredNet =
          residualNet > 0.01
            ? Math.min(residualNet, roundMoney(residualVat / (missingRate / 100)))
            : zeroRateLine
              ? Math.min(zeroRateLine.netAmount, roundMoney(residualVat / (missingRate / 100)))
              : roundMoney(residualVat / (missingRate / 100));

        const splitZeroRateLine = normalized.find(
          (line) => Math.abs(line.rate) < 0.001 && line.netAmount >= inferredNet - 0.01,
        );

        if (!splitZeroRateLine && residualNet <= 0.01) {
          continue;
        }

        inferredNet = roundMoney(inferredNet);
        const inferredVat = roundMoney(inferredNet * (missingRate / 100));

        if (splitZeroRateLine) {
          splitZeroRateLine.netAmount = roundMoney(splitZeroRateLine.netAmount - inferredNet);
          splitZeroRateLine.grossAmount = roundMoney(
            splitZeroRateLine.netAmount + splitZeroRateLine.taxAmount,
          );
        }

        normalized.push({
          id: `tax_${fileName}_${normalized.length}`,
          label: `VAT ${missingRate}%`,
          netAmount: inferredNet,
          taxAmount: inferredVat,
          grossAmount: roundMoney(inferredNet + inferredVat),
          rate: missingRate,
          recoverable: true,
        });

        residualNet = roundMoney(residualNet - inferredNet);
        residualVat = roundMoney(residualVat - inferredVat);
      }
    }
  }

  const explicitNet = totals.net;
  if (explicitNet !== undefined) {
    const currentNet = roundMoney(
      normalized.reduce((sum, line) => sum + line.netAmount, 0),
    );
    const residualNet = roundMoney(explicitNet - currentNet);

    if (residualNet > 0.01) {
      normalized.push({
        id: `tax_${fileName}_${normalized.length}`,
        label: "VAT 0%",
        netAmount: residualNet,
        taxAmount: 0,
        grossAmount: residualNet,
        rate: 0,
        recoverable: true,
      });
    }
  }

  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    if (normalized[index].netAmount <= 0.01 && normalized[index].taxAmount <= 0.01) {
      normalized.splice(index, 1);
    }
  }

  return normalized;
}

function buildDocument(
  fileName: string,
  mimeType: string,
  fields: AiExtractedFields,
  rawExtractedText: string,
  confidence: number,
): ExtractedDocument {
  const fallbackTaxLines = parseSummaryTaxLinesFromText(rawExtractedText);
  const taxLines = normaliseTaxLines(
    fields.taxLines && fields.taxLines.length > 0 ? fields.taxLines : fallbackTaxLines,
    {
      gross: fields.gross ?? undefined,
      net: fields.net ?? findExplicitNetSubtotal(rawExtractedText),
      vat:
        fields.vat ??
        (fields.gross != null &&
        (fields.net != null || findExplicitNetSubtotal(rawExtractedText) !== undefined)
          ? roundMoney(
              fields.gross -
                (fields.net ?? findExplicitNetSubtotal(rawExtractedText) ?? 0),
            )
          : undefined),
    },
    fileName,
    rawExtractedText,
  );

  const netFromLines =
    taxLines.length > 0
      ? roundMoney(taxLines.reduce((sum, line) => sum + line.netAmount, 0))
      : undefined;
  const vatFromLines =
    taxLines.length > 0
      ? roundMoney(taxLines.reduce((sum, line) => sum + line.taxAmount, 0))
      : undefined;
  const grossFromLines =
    taxLines.length > 0
      ? roundMoney(taxLines.reduce((sum, line) => sum + line.grossAmount, 0))
      : undefined;

  const gross =
    grossFromLines !== undefined &&
    fields.gross != null &&
    fields.gross > 0 &&
    Math.abs(fields.gross - grossFromLines) <= 1.5
      ? fields.gross
      : (grossFromLines ?? (fields.gross != null && fields.gross > 0 ? fields.gross : undefined));
  const net =
    netFromLines !== undefined &&
    fields.net != null &&
    fields.net >= 0 &&
    Math.abs(fields.net - netFromLines) <= 1.5
      ? fields.net
      : (netFromLines ?? (fields.net != null && fields.net >= 0 ? fields.net : undefined));
  const vat =
    vatFromLines !== undefined &&
    fields.vat != null &&
    fields.vat >= 0 &&
    Math.abs(fields.vat - vatFromLines) <= 1.5
      ? fields.vat
      : (vatFromLines ?? (fields.vat != null && fields.vat >= 0 ? fields.vat : undefined));
  const currency = fields.currency ?? findCurrency(rawExtractedText) ?? "GBP";
  const countryCode = inferCountryCodeFromTextOrCurrency(
    rawExtractedText,
    currency,
    fields.countryCode,
  );

  return {
    id: `doc_${fileName.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${Date.now()}`,
    fileName,
    supplier:
      fields.supplier?.trim() ||
      findSupplierFromText(rawExtractedText) ||
      fileName.replace(/\.[^.]+$/, ""),
    issueDate: fields.issueDate ?? findDate(rawExtractedText),
    gross,
    net,
    vat,
    vatRateSummary:
      taxLines.length > 1
        ? taxLines.map((line) => `${line.rate.toFixed(1)}%`).join(", ")
        : taxLines[0]
          ? `${taxLines[0].rate.toFixed(1)}%`
          : "0%",
    countryCode,
    currency,
    documentNumber: fileName.replace(/\.[^.]+$/, "").toUpperCase(),
    rawExtractedText,
    confidence,
    duplicateFingerprint: `${fileName.toLowerCase()}_${mimeType}`,
    taxLines,
  };
}

function buildRegexOnlyDocument(
  fileName: string,
  mimeType: string,
  rawText: string,
  confidence: number,
) {
  const values = findMoneyValues(rawText);
  const net = findExplicitNetSubtotal(rawText);
  const taxLines = parseSummaryTaxLinesFromText(rawText);

  // Prefer an explicitly-labelled total over the largest number found,
  // since the largest number could be a quantity or reference.
  const explicitTotal = findTotalAmount(rawText);
  const gross = explicitTotal ?? (values.length > 0 ? Math.max(...values) : undefined);

  // Derive VAT if we have both gross and net
  const derivedVat =
    gross !== undefined && net !== undefined && gross > net
      ? roundMoney(gross - net)
      : null;

  return buildDocument(
    fileName,
    mimeType,
    {
      supplier: null,
      issueDate: findDate(rawText),
      gross: gross ?? null,
      net: net ?? null,
      vat: derivedVat,
      currency: findCurrency(rawText),
      taxLines,
    },
    rawText,
    confidence,
  );
}

export async function extractDocumentFromBuffer(
  fileName: string,
  mimeType: string,
  buffer: ArrayBuffer,
): Promise<ExtractedDocument> {
  if (mimeType === "application/pdf") {
    let rawText = "";

    try {
      const parser = new PDFParse({ data: Buffer.from(buffer) });
      const parsed = await parser.getText();
      rawText = parsed.text ?? "";
      await parser.destroy();
    } catch {
      rawText = "";
    }

    if (rawText.trim().length >= 20) {
      const ai = await extractWithGroq(rawText);
      if (ai) {
        return buildDocument(fileName, mimeType, ai, rawText, 0.88);
      }
      return buildRegexOnlyDocument(fileName, mimeType, rawText, 0.45);
    }

    const vision =
      (await extractWithGeminiVision(buffer, mimeType)) ??
      (await extractWithGroqVision(buffer, mimeType));
    if (vision) {
      return buildDocument(fileName, mimeType, vision, "", 0.85);
    }

    return buildDocument(
      fileName,
      mimeType,
      { supplier: null, issueDate: null, gross: null, net: null, vat: null, currency: null, taxLines: [] },
      "",
      0.2,
    );
  }

  const vision =
    (await extractWithGeminiVision(buffer, mimeType)) ??
    (await extractWithGroqVision(buffer, mimeType));
  if (vision) {
    return buildDocument(fileName, mimeType, vision, "", 0.9);
  }

  return buildDocument(
    fileName,
    mimeType,
    { supplier: null, issueDate: null, gross: null, net: null, vat: null, currency: null, taxLines: [] },
    "",
    0.2,
  );
}

export async function extractDocumentFromTextWithAI(
  fileName: string,
  mimeType: string,
  rawText: string,
  confidence: number,
): Promise<ExtractedDocument> {
  console.log(`[extractor] ${fileName} | chars=${rawText.length} | conf=${confidence.toFixed(2)}`);
  if (rawText.length > 0) {
    console.log(`[extractor] text preview:\n${rawText.slice(0, 600)}`);
  }

  const ai = await extractWithGroq(rawText);
  if (ai) {
    console.log(`[extractor] Groq result for ${fileName}:`, JSON.stringify(ai));
    return buildDocument(fileName, mimeType, ai, rawText, Math.max(confidence, 0.82));
  }

  const doc = buildRegexOnlyDocument(fileName, mimeType, rawText, confidence);
  console.log(`[extractor] regex result for ${fileName}: gross=${doc.gross} net=${doc.net} vat=${doc.vat}`);
  return doc;
}

export function extractDocumentFromClientPayload(
  input: ClientExtractedDocumentInput,
): ExtractedDocument {
  return buildRegexOnlyDocument(
    input.fileName,
    input.mimeType,
    input.rawExtractedText ?? "",
    input.confidence ?? 0.4,
  );
}
