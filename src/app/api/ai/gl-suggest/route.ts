import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { requireApiAuth } from "@/lib/api/auth-guard";

const SYSTEM_PROMPT = `You are a GL (General Ledger) code assistant for a UK finance team.

Given a supplier name and optional description, suggest the most appropriate GL code from common UK chart of accounts categories.

Common GL codes:
- 7000: Purchases / Cost of goods
- 7100: Wages and salaries
- 7200: Travel and accommodation
- 7300: Entertainment and hospitality
- 7400: Transport and vehicles
- 7500: IT and software / subscriptions
- 7600: Office supplies and stationery
- 7700: Marketing and advertising
- 7800: Professional services (legal, accounting)
- 7900: Utilities and premises
- 8000: Other operating expenses

Return ONLY valid JSON, no markdown:
{"glCode": "7400", "reason": "Taxi / transport service"}

If you cannot determine a code with confidence:
{"glCode": null, "reason": "Cannot determine category from supplier name alone"}`;

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;

    let body: { supplier?: unknown; description?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const supplier = typeof body.supplier === "string" ? body.supplier.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (!supplier) {
      return NextResponse.json({ error: "No supplier provided" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 503 });
    }

    const groq = new Groq({ apiKey });

    const userMessage = description
      ? `Supplier: ${supplier.slice(0, 100)}\nDescription: ${description.slice(0, 200)}`
      : `Supplier: ${supplier.slice(0, 100)}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 80,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: "AI returned an unexpected response" }, { status: 500 });
    }
  } catch (err) {
    console.error("[AI gl-suggest] error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
