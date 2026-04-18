import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getRepository } from "@/lib/data";

const SYSTEM_PROMPT = `You are an AI bookkeeping categorization assistant.
Your job is to map a list of transactions to the best-fitting category from a provided set of valid categories.

Here are the valid categories and what they typically include:
{CATEGORIES_CONTEXT}

Input format:
You will receive a JSON list of transactions.
[{ "id": "tx-1", "merchant": "Tesco", "description": "Fuel" }, ...]

Output format:
You MUST return ONLY valid JSON in the exact structure below. Do not add markdown or explanations outside the JSON.
{
  "results": [
    { "id": "tx-1", "category": "Fuel", "reason": "Matched Tesco Fuel via known patterns" }
  ]
}

Rules:
1. ONLY use category names exactly as they appear in the provided "name" fields.
2. Use the provided "description", "supplierPattern", and "keywordPattern" as strong hints for what belongs in each category.
3. If you are not confident, return null for the category: { "id": "tx-2", "category": null, "reason": "Ambiguous merchant" }
4. Return the array exactly matching the length of the input transactions.
`;

export async function POST(req: NextRequest) {
  try {
    const { transactions } = (await req.json()) as {
      transactions?: { id: string; merchant: string; description: string }[]
    };

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: "No transactions provided" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 503 });
    }

    const repository = await getRepository();

    // AI categorisation is restricted to the account set in AI_OWNER_EMAIL
    const currentUser = await repository.getCurrentUser();
    const aiOwnerEmail = process.env.AI_OWNER_EMAIL?.trim().toLowerCase();
    const isAllowed = Boolean(aiOwnerEmail && currentUser.email.toLowerCase() === aiOwnerEmail);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "AI categorisation is not available for your account." },
        { status: 403 },
      );
    }
    
    // Get visible categories with their context
    const settings = await repository.getSettingsSnapshot();
    const activeCategories = settings.categoryRules
      .filter((r) => r.isActive && r.isVisible)
      .sort((a, b) => a.category.localeCompare(b.category));

    if (activeCategories.length === 0) {
      return NextResponse.json({ error: "No active categories found in workspace." }, { status: 400 });
    }

    const groq = new Groq({ apiKey });

    const categoriesContext = activeCategories.map((c) => {
      let ctx = `- Name: "${c.category}"\n  Description: ${c.description || "No description"}`;
      if (c.supplierPattern) ctx += `\n  Supplier Hints: ${c.supplierPattern}`;
      if (c.keywordPattern) ctx += `\n  Keyword Hints: ${c.keywordPattern}`;
      return ctx;
    }).join("\n\n");

    const systemPrompt = SYSTEM_PROMPT.replace("{CATEGORIES_CONTEXT}", categoriesContext);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(transactions, null, 2) },
      ],
      temperature: 0.1,
      // Increase max tokens since we are passing a list of transactions
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    
    // Some LLaMA JSON mode outputs wrap arrays in an object: { "results": [...] } or similar.
    // Try to safely parse array out of it.
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
    }

    // Best-effort extraction of the array
    let resultsArray = [];
    if (Array.isArray(parsed)) {
      resultsArray = parsed;
    } else if (parsed && typeof parsed === "object") {
      // Find the first array property
      const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
      if (arrayKey) {
        resultsArray = parsed[arrayKey];
      }
    }

    return NextResponse.json({ results: resultsArray });

  } catch (error) {
    console.error("[Categorise AI] error:", error);
    return NextResponse.json(
      { error: "Failed to communicate with AI service" },
      { status: 500 }
    );
  }
}
