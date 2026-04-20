import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireApiAuth } from "@/lib/api/auth-guard";

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;

    let body: {
      supplier?: unknown;
      exceptions?: { code: string; severity: string; message: string }[];
      gross?: unknown;
      net?: unknown;
      vat?: unknown;
      vatCode?: unknown;
      glCode?: unknown;
      currency?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const { supplier, exceptions, gross, net, vat, vatCode, glCode, currency } = body;

    if (!Array.isArray(exceptions) || exceptions.length === 0) {
      return NextResponse.json({ explanation: "No exceptions to explain." });
    }

    // Limit exceptions to prevent prompt stuffing
    const safeExceptions = exceptions.slice(0, 20);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const exceptionList = safeExceptions
      .map((e) => `- ${String(e.code).slice(0, 50)} (${String(e.severity).slice(0, 20)}): ${String(e.message).slice(0, 200)}`)
      .join("\n");

    const safeSupplier = String(supplier ?? "Unknown").slice(0, 100);
    const safeCurrency = String(currency ?? "").slice(0, 10);

    const prompt = `You are a finance assistant helping a bookkeeper understand why a transaction was flagged during reconciliation.

Transaction details:
- Supplier: ${safeSupplier}
- Gross: ${gross ?? "unknown"} ${safeCurrency}
- Net: ${net ?? "unknown"} ${safeCurrency}
- VAT: ${vat ?? "unknown"} ${safeCurrency}
- VAT Code: ${vatCode ?? "not set"}
- GL Code: ${glCode ?? "not set"}

Exceptions flagged:
${exceptionList}

Write a short, plain-English explanation (2-4 sentences) of what is wrong and what the bookkeeper should check or do to resolve it. Be specific and practical. Do not use jargon. Do not use bullet points.`;

    const result = await model.generateContent(prompt);
    const explanation = result.response.text().trim();

    return NextResponse.json({ explanation });
  } catch (err) {
    console.error("[AI explain] error:", err);
    return NextResponse.json({ error: "Failed to communicate with AI service." }, { status: 500 });
  }
}
