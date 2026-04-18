import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getRepository } from "@/lib/data";

const SYSTEM_PROMPT = `You are a high-performance AI bookkeeping assistant.
Your goal is to map transactions to the most appropriate category from the provided list.

Context:
- Today's date: {CURRENT_DATE}
- Available Categories:
{CATEGORIES_CONTEXT}

Input:
A JSON list of transactions with unique IDs.

Rules:
1. MANDATORY CATEGORIZATION: You must look for the "Best Fit" category for every transaction. 
2. MERCHANT SIGNAL: The "merchant" name is your primary signal. Recognizable brands should be mapped to their logical category (e.g., Starbucks is usually "Food & Drink" or "Travel/Subsistence").
3. FUZZY MATCHING: Descriptions can be messy. If a merchant name is recognized but the description is generic (e.g. "VISA"), categorize based on the merchant.
4. REASONING: For every item, provide a brief "reason" explaining your choice (e.g. "Matched as fuel merchant").
5. STRICT JSON: You must return valid JSON in the exact structure below. No markdown. No headers.

Output Structure:
{
  "results": [
    { "id": "tx-1", "category": "Fuel", "reason": "Consistent with fuel supplier keyword" },
    { "id": "tx-2", "category": null, "reason": "Truly zero signal in data" }
  ]
}

Only return null if the data has absolutely zero signal (e.g. just numbers or symbols). If there is any plausible match, choose it.
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

    const systemPrompt = SYSTEM_PROMPT
      .replace("{CATEGORIES_CONTEXT}", categoriesContext)
      .replace("{CURRENT_DATE}", new Date().toISOString().split("T")[0]);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(transactions, null, 2) },
      ],
      temperature: 0.2,
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
    let resultsArray: any[] = [];
    if (parsed) {
      if (Array.isArray(parsed)) {
        resultsArray = parsed;
      } else if (typeof parsed === "object") {
        // Find results key or any array key
        if (Array.isArray(parsed.results)) {
          resultsArray = parsed.results;
        } else if (Array.isArray(parsed.transactions)) {
          resultsArray = parsed.transactions;
        } else {
          const firstArrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
          if (firstArrayKey) resultsArray = parsed[firstArrayKey];
        }
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
