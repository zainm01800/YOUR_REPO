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

const CreateInvoiceSchema = z.object({
  clientId: z.string().min(1).max(128),
  invoiceNumber: z.string().min(1).max(50),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lineItems: z.array(LineItemSchema).min(1).max(100),
  currency: z.string().max(3).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const invoices = await repository!.getInvoices();
    return NextResponse.json(invoices);
  } catch (err) {
    console.error("[GET /api/invoices]", err);
    return NextResponse.json({ error: "Failed to fetch invoices." }, { status: 500 });
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
    const parsed = CreateInvoiceSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const invoice = await repository!.createInvoice(parsed.data);
    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    console.error("[POST /api/invoices]", err);
    return NextResponse.json({ error: "Failed to create invoice." }, { status: 500 });
  }
}
