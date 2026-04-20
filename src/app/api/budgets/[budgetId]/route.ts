import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api/auth-guard";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ budgetId: string }> },
) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const { budgetId } = await params;
    await repository!.deleteCategoryBudget(budgetId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/budgets/[budgetId]]", err);
    return NextResponse.json({ error: "Failed to delete budget." }, { status: 500 });
  }
}
