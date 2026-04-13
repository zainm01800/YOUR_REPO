import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getRepository } from "@/lib/data";

const SOURCE_FIELDS = [
  "supplier", "date", "currency", "originalAmount", "gross",
  "net", "vat", "vatPercent", "vatCode", "glCode",
  "employee", "originalDescription", "approved",
];

function getColumnSamples(previewRows: string[][], columnIndex: number) {
  return previewRows
    .map((row) => row?.[columnIndex]?.trim() || "")
    .filter(Boolean);
}

function looksLikeDate(value: string) {
  return /^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}$/.test(value);
}

function looksLikeCurrencyCode(value: string) {
  return /^[A-Z]{3}$/.test(value);
}

function looksLikePercent(value: string) {
  return /^-?\d+(?:[.,]\d+)?%$/.test(value) || /^-?\d+(?:[.,]\d+)?$/.test(value);
}

function looksLikeAmount(value: string) {
  const normalized = value.replace(/[,\s]/g, "").replace(/[£$€]/g, "");
  return /^-?\d+(?:\.\d{1,2})?$/.test(normalized);
}

export async function POST(request: NextRequest) {
  const { templateHeaders, previewRows, runId } = await request.json() as {
    templateHeaders: string[];
    previewRows?: string[][];
    runId?: string;
  };

  if (!Array.isArray(templateHeaders) || templateHeaders.length === 0) {
    return NextResponse.json({ error: "No headers provided" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  const repository = await getRepository();
  const runSampleRows = typeof runId === "string"
    ? (await repository.getRunRows(runId))
        .filter((row) => !row.excludedFromExport)
        .slice(0, 3)
        .map((row) => ({
          supplier: row.supplier,
          date: row.date,
          currency: row.currency,
          originalAmount: row.originalAmount,
          gross: row.gross,
          net: row.net,
          vat: row.vat,
          vatPercent: row.vatPercent,
          vatCode: row.vatCode,
          glCode: row.glCode,
          employee: row.employee,
          originalDescription: row.originalDescription,
        }))
    : [];

  if (!apiKey || apiKey === "your_groq_api_key_here") {
    // Fallback: keyword matching plus sample-value inspection.
    const fallback: Record<string, string> = {};
    for (const [columnIndex, header] of templateHeaders.entries()) {
      const lower = header.toLowerCase();
      const samples = getColumnSamples(previewRows || [], columnIndex);
      const uniqueSamples = [...new Set(samples)];
      const allSameFilledValue = uniqueSamples.length === 1 && samples.length >= 2;

      if (lower.includes("supplier") || lower.includes("vendor") || lower.includes("payee")) fallback[header] = "supplier";
      else if (lower.includes("date") || lower.includes("posting")) fallback[header] = "date";
      else if (lower.includes("gross") || lower.includes("total")) fallback[header] = "gross";
      else if (lower.includes("net") || lower.includes("base")) fallback[header] = "net";
      else if (lower.includes("vat") || lower.includes("tax amount")) fallback[header] = "vat";
      else if (lower.includes("vat %") || lower.includes("tax rate") || lower.includes("rate")) fallback[header] = "vatPercent";
      else if (lower.includes("vat code") || lower.includes("tax code")) fallback[header] = "vatCode";
      else if (lower.includes("gl") || lower.includes("account") || lower.includes("cost")) fallback[header] = "glCode";
      else if (lower.includes("currency") || lower.includes("curr")) fallback[header] = "currency";
      else if (lower.includes("employee") || lower.includes("staff") || lower.includes("person")) fallback[header] = "employee";
      else if (lower.includes("description") || lower.includes("narration") || lower.includes("memo")) fallback[header] = "originalDescription";
      else if (lower.includes("amount") || lower.includes("value")) fallback[header] = "originalAmount";
      else if (allSameFilledValue) fallback[header] = "";
      else if (samples.some(looksLikeCurrencyCode)) fallback[header] = "currency";
      else if (samples.some(looksLikeDate)) fallback[header] = "date";
      else if (samples.some(looksLikePercent)) fallback[header] = "vatPercent";
      else if (samples.some(looksLikeAmount)) fallback[header] = "originalAmount";
    }
    return NextResponse.json({ mappings: fallback });
  }

  const groq = new Groq({ apiKey });

  const prompt = `You are a finance data mapping assistant. Map each template column header to the most appropriate reconciliation data field.

Template column headers: ${JSON.stringify(templateHeaders)}
Existing sample values from the uploaded sheet: ${JSON.stringify(previewRows || [])}
Sample rows from the chosen reconciliation run: ${JSON.stringify(runSampleRows)}

Available source fields: ${SOURCE_FIELDS.join(", ")}

Use the existing filled values and the reconciliation run samples to decide which columns should be overwritten when the run changes. If a column already looks like a fixed ERP constant, control field, or repeating template value, return null for that column.

Respond with ONLY a JSON object mapping each template header to the best matching source field, or null if there is no match. Example:
{"Vendor Name": "supplier", "Posting Date": "date", "Reference": null}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text = completion.choices[0]?.message?.content?.trim() || "{}";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const mappings = JSON.parse(jsonMatch?.[0] || "{}");
    return NextResponse.json({ mappings });
  } catch {
    return NextResponse.json({ mappings: {} });
  }
}
