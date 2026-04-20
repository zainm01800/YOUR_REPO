import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api/auth-guard";

const UpdateExpenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().min(1).max(500).optional(),
  merchant: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  vatCode: z.string().max(20).optional(),
  glCode: z.string().max(50).optional(),
  amount: z.number().min(0).optional(),
  currency: z.string().max(3).optional(),
  isMileage: z.boolean().optional(),
  mileageMiles: z.number().min(0).max(10000).optional(),
  mileageRatePerMile: z.number().min(0).max(2).optional(),
  notes: z.string().max(2000).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const { expenseId } = await params;
    let raw: unknown;
    try { raw = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = UpdateExpenseSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const expense = await repository!.updateManualExpense(expenseId, parsed.data);
    return NextResponse.json(expense);
  } catch (err) {
    console.error("[PUT /api/expenses/[expenseId]]", err);
    return NextResponse.json({ error: "Failed to update expense." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const { expenseId } = await params;
    await repository!.deleteManualExpense(expenseId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/expenses/[expenseId]]", err);
    return NextResponse.json({ error: "Failed to delete expense." }, { status: 500 });
  }
}
