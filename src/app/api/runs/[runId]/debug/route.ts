import { NextResponse } from "next/server";
import { isWebsiteOwnerEmail } from "@/lib/auth/viewer-access";
import { requireApiAuth } from "@/lib/api/auth-guard";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const { repository, errorResponse } = await requireApiAuth();
  if (errorResponse) return errorResponse;

  // Debug endpoint is restricted to the website owner only
  const currentUser = await repository.getCurrentUser();
  if (!isWebsiteOwnerEmail(currentUser.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const run = await repository.getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({
    runId: run.id,
    status: run.status,
    transactionCount: run.transactions.length,
    documentCount: run.documents.length,
    transactions: run.transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      merchant: t.merchant,
      currency: t.currency,
    })),
    documents: run.documents.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      supplier: d.supplier,
      gross: d.gross,
      net: d.net,
      vat: d.vat,
      currency: d.currency,
      taxLineCount: d.taxLines?.length ?? 0,
      rawTextLength: d.rawExtractedText?.length ?? 0,
      rawTextPreview: d.rawExtractedText?.slice(0, 200),
    })),
  });
}
