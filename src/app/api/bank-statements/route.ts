import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import type { TransactionRecord } from "@/lib/domain/types";
import {
  detectBankPreset,
  detectDefaultMapping,
  mapTransactions,
  parseNativeFormat,
  parseTransactionFile,
} from "@/lib/transactions/parser";

export async function GET() {
  const repository = await getRepository();
  const statements = await repository.getBankStatements();
  return NextResponse.json(statements);
}

const MAX_STATEMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: Request) {
  const repository = await getRepository();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const statementFile = formData.get("statementFile");

  if (!(statementFile instanceof File) || statementFile.size === 0) {
    return NextResponse.json(
      { error: "A bank statement file is required." },
      { status: 400 },
    );
  }

  if (statementFile.size > MAX_STATEMENT_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Maximum size is 20 MB." },
      { status: 413 },
    );
  }

  const customName = String(formData.get("name") || "").trim().slice(0, 200);
  const defaultCurrency = String(formData.get("defaultCurrency") || "GBP").slice(0, 10);

  let columnMappings: Record<string, string>;
  try {
    columnMappings = JSON.parse(
      String(formData.get("columnMappings") || "{}"),
    ) as Record<string, string>;
  } catch {
    columnMappings = {};
  }

  const buffer = await statementFile.arrayBuffer();
  const fileName = statementFile.name;

  // Try native format first (OFX, QIF)
  const nativeTransactions = await parseNativeFormat(buffer, fileName, defaultCurrency);

  let transactions: TransactionRecord[];
  let headers: string[] = [];
  let mappings: Record<string, string> = {};

  if (nativeTransactions !== null) {
    // OFX/QIF parsed directly — no column mapping needed
    transactions = nativeTransactions;
  } else {
    // CSV/Excel flow
    const parsed = await parseTransactionFile(buffer);
    headers = parsed.headers;

    // Detect bank preset from headers + filename
    const detected = detectBankPreset(parsed.headers, fileName);
    const presetMappings = detected?.preset.mappings ?? {};

    mappings = Object.keys(columnMappings).length > 0
      ? columnMappings
      : { ...detectDefaultMapping(parsed.headers), ...presetMappings };

    transactions = mapTransactions(parsed, mappings, defaultCurrency, detected?.preset);
  }

  const statement = await repository.importBankStatement({
    name: customName || statementFile.name.replace(/\.[^.]+$/, ""),
    fileName: statementFile.name,
    mimeType: statementFile.type || "application/octet-stream",
    sizeBytes: statementFile.size,
    headers,
    columnMappings: mappings,
    defaultCurrency,
    transactions,
  });

  return NextResponse.json({
    ok: true,
    statementId: statement.id,
    redirectTo: `/bank-statements/${statement.id}`,
  });
}
