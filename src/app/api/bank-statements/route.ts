import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import {
  detectDefaultMapping,
  mapTransactions,
  parseTransactionFile,
} from "@/lib/transactions/parser";

export async function GET() {
  const repository = getRepository();
  const statements = await repository.getBankStatements();
  return NextResponse.json(statements);
}

export async function POST(request: Request) {
  const repository = getRepository();
  const formData = await request.formData();
  const statementFile = formData.get("statementFile");

  if (!(statementFile instanceof File) || statementFile.size === 0) {
    return NextResponse.json(
      { error: "A bank statement file is required." },
      { status: 400 },
    );
  }

  const customName = String(formData.get("name") || "").trim();
  const defaultCurrency = String(formData.get("defaultCurrency") || "GBP");
  const columnMappings = JSON.parse(
    String(formData.get("columnMappings") || "{}"),
  ) as Record<string, string>;

  const parsed = parseTransactionFile(await statementFile.arrayBuffer());
  const mappings =
    Object.keys(columnMappings).length > 0
      ? columnMappings
      : detectDefaultMapping(parsed.headers);
  const transactions = mapTransactions(parsed, mappings, defaultCurrency);

  const statement = await repository.importBankStatement({
    name: customName || statementFile.name.replace(/\.[^.]+$/, ""),
    fileName: statementFile.name,
    mimeType: statementFile.type || "application/octet-stream",
    sizeBytes: statementFile.size,
    headers: parsed.headers,
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
