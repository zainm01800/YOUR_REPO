import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api/auth-guard";

const UpsertBudgetSchema = z.object({
  category: z.string().min(1).max(100),
  amount: z.number().min(0),
  period: z.enum(["monthly", "annual"]),
});

export async function GET() {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const budgets = await repository!.getCategoryBudgets();
    return NextResponse.json(budgets);
  } catch (err) {
    console.error("[GET /api/budgets]", err);
    return NextResponse.json({ error: "Failed to fetch budgets." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    let raw: unknown;
    try { raw = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = UpsertBudgetSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const budget = await repository!.upsertCategoryBudget(parsed.data.category, parsed.data.amount, parsed.data.period);
    return NextResponse.json(budget);
  } catch (err) {
    console.error("[POST /api/budgets]", err);
    return NextResponse.json({ error: "Failed to save budget." }, { status: 500 });
  }
}
