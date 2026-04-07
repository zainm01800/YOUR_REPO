import { PDFParse } from "pdf-parse";
import type {
  ClientExtractedDocumentInput,
  ExtractedDocument,
} from "@/lib/domain/types";

function deriveFromFileName(fileName: string) {
  const cleaned = fileName.toLowerCase();
  return {
    supplier: cleaned.includes("uber")
      ? "Uber"
      : cleaned.includes("hotel")
        ? "Harbour Hotel"
        : cleaned.includes("aws")
          ? "Amazon Web Services"
          : cleaned.includes("costa")
            ? "Costa Coffee"
            : "Uploaded document",
  };
}

function findMoney(text: string) {
  const values = [...text.matchAll(/(\d+\.\d{2})/g)].map((match) =>
    Number(match[1]),
  );
  return values;
}

function findCurrency(text: string) {
  if (/\bUSD\b|\$/i.test(text)) return "USD";
  if (/\bEUR\b|€/i.test(text)) return "EUR";
  return "GBP";
}

function findDate(text: string) {
  const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const slashMatch = text.match(/\b(\d{2}\/\d{2}\/20\d{2})\b/);
  if (slashMatch) {
    const [day, month, year] = slashMatch[1].split("/");
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().slice(0, 10);
}

function buildExtractedDocumentFromText(
  fileName: string,
  rawText: string,
  mimeType: string,
  confidence = rawText ? 0.74 : 0.42,
): ExtractedDocument {
  const moneyValues = findMoney(rawText);
  const gross = moneyValues.at(-1);
  const vat = moneyValues.length >= 2 ? moneyValues.at(-2) : undefined;
  const net =
    gross !== undefined && vat !== undefined ? Number((gross - vat).toFixed(2)) : gross;
  const currency = findCurrency(rawText);

  return {
    id: `doc_${fileName.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
    fileName,
    supplier: deriveFromFileName(fileName).supplier,
    issueDate: findDate(rawText),
    gross,
    net,
    vat,
    vatRateSummary: vat && net ? `${((vat / net) * 100).toFixed(1)}%` : "0%",
    countryCode: "GB",
    currency,
    documentNumber: fileName.replace(/\.[^.]+$/, "").toUpperCase(),
    rawExtractedText: rawText,
    confidence,
    duplicateFingerprint: `${fileName.toLowerCase()}_${mimeType}`,
    taxLines: gross
      ? [
          {
            id: `tax_${fileName}`,
            label: "Extracted",
            netAmount: net || gross,
            taxAmount: vat || 0,
            grossAmount: gross,
            rate: vat && net ? Number(((vat / net) * 100).toFixed(1)) : 0,
            recoverable: true,
          },
        ]
      : [],
  };
}

export async function extractDocumentFromBuffer(
  fileName: string,
  mimeType: string,
  buffer: ArrayBuffer,
): Promise<ExtractedDocument> {
  let rawText = "";

  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: Buffer.from(buffer) });
    const parsed = await parser.getText();
    rawText = parsed.text || "";
    await parser.destroy();
  }

  return buildExtractedDocumentFromText(fileName, rawText, mimeType);
}

export function extractDocumentFromClientPayload(
  input: ClientExtractedDocumentInput,
): ExtractedDocument {
  return buildExtractedDocumentFromText(
    input.fileName,
    input.rawExtractedText,
    input.mimeType,
    input.confidence ?? 0.68,
  );
}
