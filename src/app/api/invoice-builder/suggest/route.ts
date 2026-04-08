import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const SOURCE_FIELDS = [
  "supplier", "date", "currency", "originalAmount", "gross",
  "net", "vat", "vatPercent", "vatCode", "glCode",
  "employee", "originalDescription", "approved",
];

export async function POST(request: NextRequest) {
  const { templateHeaders } = await request.json() as { templateHeaders: string[] };

  if (!Array.isArray(templateHeaders) || templateHeaders.length === 0) {
    return NextResponse.json({ error: "No headers provided" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    // Fallback: simple keyword matching
    const fallback: Record<string, string> = {};
    for (const header of templateHeaders) {
      const lower = header.toLowerCase();
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
    }
    return NextResponse.json({ mappings: fallback });
  }

  const groq = new Groq({ apiKey });

  const prompt = `You are a finance data mapping assistant. Map each template column header to the most appropriate reconciliation data field.

Template column headers: ${JSON.stringify(templateHeaders)}

Available source fields: ${SOURCE_FIELDS.join(", ")}

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
