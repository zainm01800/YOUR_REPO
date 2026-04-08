import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const COLUMN_REFS = ["Supplier", "Original Value", "Gross", "Net", "VAT", "VAT %", "VAT Code", "GL Code"];

const SYSTEM_PROMPT = `You are a formula generator for a financial reconciliation spreadsheet tool.

Available column references (must be wrapped in square brackets exactly as shown):
${COLUMN_REFS.map((r) => `[${r}]`).join(", ")}

Operators: +, -, *, /
Rules:
- Return ONLY valid JSON, no markdown, no explanation
- Formula must use only the column references above and numeric operators
- Suggest a short, clear column label (3-6 words max)
- If the request is ambiguous or impossible, return an error field

Response format:
{"formula": "=[Gross]-[VAT]", "label": "Net from gross"}

or on error:
{"error": "Cannot compute — specify which columns to use"}`;

export async function POST(req: NextRequest) {
  const { description } = await req.json();

  if (!description?.trim()) {
    return NextResponse.json({ error: "No description provided" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 503 });
  }

  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: description },
    ],
    temperature: 0.1,
    max_tokens: 120,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";

  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "AI returned an unexpected response" }, { status: 500 });
  }
}
