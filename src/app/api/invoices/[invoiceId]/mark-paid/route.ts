import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api/auth-guard";

const MarkPaidSchema = z.object({
  paidAmount: z.number().min(0).optional(),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const { invoiceId } = await params;

    let raw: unknown = {};
    try { raw = await request.json(); } catch { /* empty body OK */ }
    const parsed = MarkPaidSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const invoice = await repository!.updateInvoice(invoiceId, {
      status: "paid",
      paidAt: parsed.data.paidAt ?? new Date().toISOString().slice(0, 10),
      paidAmount: parsed.data.paidAmount,
    });
    return NextResponse.json(invoice);
  } catch (err) {
    console.error("[POST /api/invoices/[invoiceId]/mark-paid]", err);
    return NextResponse.json({ error: "Failed to mark invoice as paid." }, { status: 500 });
  }
}
