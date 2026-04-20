import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api/auth-guard";

export async function GET() {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const invoiceNumber = await repository!.getNextInvoiceNumber();
    return NextResponse.json({ invoiceNumber });
  } catch (err) {
    console.error("[GET /api/invoices/next-number]", err);
    return NextResponse.json({ error: "Failed to get next invoice number." }, { status: 500 });
  }
}
