import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api/auth-guard";

const LineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  vatRate: z.number().min(0).max(100),
  amount: z.number().min(0),
  vatAmount: z.number().min(0),
});

const UpdateInvoiceSchema = z.object({
  clientId: z.string().min(1).max(128).optional(),
  invoiceNumber: z.string().min(1).max(50).optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  lineItems: z.array(LineItemSchema).min(1).max(100).optional(),
  currency: z.string().max(3).optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "void"]).optional(),
  paidAt: z.string().nullable().optional(),
  paidAmount: z.number().min(0).nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const { invoiceId } = await params;
    const invoice = await repository!.getInvoice(invoiceId);
    if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    return NextResponse.json(invoice);
  } catch (err) {
    console.error("[GET /api/invoices/[invoiceId]]", err);
    return NextResponse.json({ error: "Failed to fetch invoice." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const { invoiceId } = await params;
    let raw: unknown;
    try { raw = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = UpdateInvoiceSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const invoice = await repository!.updateInvoice(invoiceId, parsed.data);
    return NextResponse.json(invoice);
  } catch (err) {
    console.error("[PUT /api/invoices/[invoiceId]]", err);
    return NextResponse.json({ error: "Failed to update invoice." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const { invoiceId } = await params;
    await repository!.deleteInvoice(invoiceId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/invoices/[invoiceId]]", err);
    return NextResponse.json({ error: "Failed to delete invoice." }, { status: 500 });
  }
}
