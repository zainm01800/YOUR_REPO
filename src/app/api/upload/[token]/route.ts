/**
 * POST /api/upload/[token]
 *
 * Public (no Clerk auth) endpoint for client bank-statement uploads.
 * Authenticated using a static UPLOAD_TOKEN env var.
 * Files are stored in the website owner's primary workspace.
 */

import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/data/prisma";
import {
  detectBankPreset,
  detectDefaultMapping,
  mapTransactions,
  parseNativeFormat,
  parseTransactionFile,
} from "@/lib/transactions/parser";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    // --- Token validation ---
    const UPLOAD_TOKEN = process.env.UPLOAD_TOKEN?.trim();
    if (!UPLOAD_TOKEN || token !== UPLOAD_TOKEN) {
      return NextResponse.json({ error: "Invalid or expired upload link." }, { status: 401 });
    }

    // --- Parse form data ---
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }

    const statementFile = formData.get("statementFile");
    if (!(statementFile instanceof File) || statementFile.size === 0) {
      return NextResponse.json({ error: "A file is required." }, { status: 400 });
    }

    if (statementFile.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File is too large. Maximum size is 20 MB." }, { status: 413 });
    }

    const clientName = String(formData.get("name") || "Client").trim().slice(0, 200);
    const defaultCurrency = String(formData.get("defaultCurrency") || "GBP").slice(0, 10);

    // --- Resolve owner's workspace ---
    const prisma = getPrismaClient();
    if (!prisma) {
      return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
    }

    const ownerEmail = process.env.APP_OWNER_EMAIL?.trim().toLowerCase();
    if (!ownerEmail) {
      return NextResponse.json({ error: "Upload destination not configured." }, { status: 503 });
    }

    const ownerUser = await prisma.user.findFirst({
      where: { email: ownerEmail },
      select: { id: true },
    });

    if (!ownerUser) {
      return NextResponse.json({ error: "Upload destination not found." }, { status: 503 });
    }

    const ownerMembership = await prisma.membership.findFirst({
      where: { userId: ownerUser.id, role: "owner" },
      include: { workspace: { select: { id: true, defaultCurrency: true } } },
    });

    if (!ownerMembership) {
      return NextResponse.json({ error: "Upload destination workspace not found." }, { status: 503 });
    }

    const workspaceId = ownerMembership.workspace.id;
    const effectiveCurrency = defaultCurrency || ownerMembership.workspace.defaultCurrency || "GBP";

    // --- Parse the file ---
    const buffer = await statementFile.arrayBuffer();
    const fileName = statementFile.name;

    const nativeTransactions = await parseNativeFormat(buffer, fileName, effectiveCurrency);

    let transactions;
    let headers: string[] = [];
    let mappings: Record<string, string> = {};

    if (nativeTransactions !== null) {
      transactions = nativeTransactions;
    } else {
      const parsed = await parseTransactionFile(buffer);
      headers = parsed.headers;
      const detected = detectBankPreset(parsed.headers, fileName);
      const presetMappings = detected?.preset.mappings ?? {};
      mappings = { ...detectDefaultMapping(parsed.headers), ...presetMappings };
      transactions = mapTransactions(parsed, mappings, effectiveCurrency, detected?.preset);
    }

    // --- Create the bank statement record ---
    const statementName = `${clientName} — ${fileName.replace(/\.[^.]+$/, "")}`;

    const statement = await prisma.bankStatement.create({
      data: {
        workspaceId,
        name: statementName,
        fileName,
        currency: effectiveCurrency,
        importStatus: "imported",
        previewHeaders: headers.length > 0 ? headers : undefined,
        savedColumnMappings: Object.keys(mappings).length > 0 ? mappings : undefined,
        transactions: {
          create: transactions.map((tx) => ({
            externalId: tx.externalId ?? undefined,
            sourceLineNumber: tx.sourceLineNumber ?? undefined,
            transactionDate: tx.transactionDate ? new Date(tx.transactionDate) : undefined,
            postedDate: tx.postedDate ? new Date(tx.postedDate) : undefined,
            amount: tx.amount,
            currency: tx.currency || effectiveCurrency,
            merchant: tx.merchant ?? undefined,
            description: tx.description ?? undefined,
            reference: tx.reference ?? undefined,
          })),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      statementId: statement.id,
      transactionCount: transactions.length,
    });
  } catch (err) {
    console.error("[Client upload] error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
