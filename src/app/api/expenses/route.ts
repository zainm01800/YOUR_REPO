import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api/auth-guard";

const CreateExpenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(500),
  merchant: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  vatCode: z.string().max(20).optional(),
  glCode: z.string().max(50).optional(),
  amount: z.number().min(0),
  currency: z.string().max(3).optional(),
  isMileage: z.boolean().optional(),
  mileageMiles: z.number().min(0).max(10000).optional(),
  mileageRatePerMile: z.number().min(0).max(2).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const expenses = await repository!.getManualExpenses();
    return NextResponse.json(expenses);
  } catch (err) {
    console.error("[GET /api/expenses]", err);
    return NextResponse.json({ error: "Failed to fetch expenses." }, { status: 500 });
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
    const parsed = CreateExpenseSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const expense = await repository!.createManualExpense(parsed.data);
    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error("[POST /api/expenses]", err);
    return NextResponse.json({ error: "Failed to create expense." }, { status: 500 });
  }
}
