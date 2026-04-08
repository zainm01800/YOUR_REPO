import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  const { supplier, exceptions, gross, net, vat, vatCode, glCode, currency } = await req.json();

  if (!exceptions?.length) {
    return NextResponse.json({ explanation: "No exceptions to explain." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const exceptionList = exceptions
    .map((e: { code: string; severity: string; message: string }) =>
      `- ${e.code} (${e.severity}): ${e.message}`,
    )
    .join("\n");

  const prompt = `You are a finance assistant helping a bookkeeper understand why a transaction was flagged during reconciliation.

Transaction details:
- Supplier: ${supplier}
- Gross: ${gross ?? "unknown"} ${currency ?? ""}
- Net: ${net ?? "unknown"} ${currency ?? ""}
- VAT: ${vat ?? "unknown"} ${currency ?? ""}
- VAT Code: ${vatCode ?? "not set"}
- GL Code: ${glCode ?? "not set"}

Exceptions flagged:
${exceptionList}

Write a short, plain-English explanation (2-4 sentences) of what is wrong and what the bookkeeper should check or do to resolve it. Be specific and practical. Do not use jargon. Do not use bullet points.`;

  const result = await model.generateContent(prompt);
  const explanation = result.response.text().trim();

  return NextResponse.json({ explanation });
}
