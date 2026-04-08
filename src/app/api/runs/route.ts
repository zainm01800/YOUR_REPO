import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import {
  detectDefaultMapping,
  mapTransactions,
  parseTransactionFile,
} from "@/lib/transactions/parser";
import { expandArchive } from "@/lib/uploads/archive";
import {
  extractDocumentFromBuffer,
  extractDocumentFromClientPayload,
} from "@/lib/uploads/extractor";
import type { ClientExtractedDocumentInput } from "@/lib/domain/types";

export async function GET() {
  const repository = getRepository();
  const snapshot = await repository.getDashboardSnapshot();
  return NextResponse.json(snapshot.runs);
}

export async function POST(request: Request) {
  const repository = getRepository();
  const formData = await request.formData();
  const name = String(formData.get("name") || "New reconciliation run");
  const entity = String(formData.get("entity") || "");
  const countryProfile = String(formData.get("countryProfile") || "GB");
  const defaultCurrency = String(formData.get("defaultCurrency") || "GBP");
  const templateId = String(formData.get("templateId") || "");
  const transactionFile = formData.get("transactionFile");
  const documentEntries = formData.getAll("documentFiles");
  const clientExtractedDocuments = JSON.parse(
    String(formData.get("clientExtractedDocuments") || "[]"),
  ) as ClientExtractedDocumentInput[];
  const clientExtractedNames = new Set(
    clientExtractedDocuments.map((document) => document.fileName),
  );

  const run = await repository.createRun({
    name,
    entity,
    countryProfile,
    defaultCurrency,
    templateId: templateId || undefined,
    transactionFileName:
      transactionFile instanceof File ? transactionFile.name : undefined,
  });

  const templates = await repository.getTemplates();
  const selectedTemplate = templates.find((template) => template.id === templateId);

  if (transactionFile instanceof File && transactionFile.size > 0) {
    try {
      const parsed = parseTransactionFile(await transactionFile.arrayBuffer());
      const mapping = selectedTemplate?.columnMappings || detectDefaultMapping(parsed.headers);
      run.previewHeaders = parsed.headers;
      run.savedColumnMappings = mapping;
      run.transactions = mapTransactions(parsed, mapping, defaultCurrency);
      run.uploadedFiles.push({
        id: `file_${Date.now()}_transactions`,
        fileName: transactionFile.name,
        originalName: transactionFile.name,
        mimeType: transactionFile.type || "application/octet-stream",
        sizeBytes: transactionFile.size,
        fileKind: "transaction_file",
      });
    } catch {
      run.previewHeaders = ["Date", "Amount", "Merchant", "Description", "Currency"];
    }
  }

  run.documents.push(
    ...clientExtractedDocuments.map((document) =>
      extractDocumentFromClientPayload(document),
    ),
  );

  for (const entry of documentEntries) {
    if (!(entry instanceof File) || entry.size === 0) {
      continue;
    }

    run.uploadedFiles.push({
      id: `file_${Date.now()}_${entry.name}`,
      fileName: entry.name,
      originalName: entry.name,
      mimeType: entry.type || "application/octet-stream",
      sizeBytes: entry.size,
      fileKind: entry.name.toLowerCase().endsWith(".zip") ? "archive" : "document",
    });

    if (entry.name.toLowerCase().endsWith(".zip")) {
      const expanded = await expandArchive(entry.name, await entry.arrayBuffer());
      for (const item of expanded) {
        if (clientExtractedNames.has(item.fileName)) {
          continue;
        }

        const extracted = await extractDocumentFromBuffer(
          item.fileName,
          item.mimeType,
          item.buffer,
        );
        run.documents.push(extracted);
      }
    } else {
      if (clientExtractedNames.has(entry.name)) {
        continue;
      }

      const extracted = await extractDocumentFromBuffer(
        entry.name,
        entry.type,
        await entry.arrayBuffer(),
      );
      run.documents.push(extracted);
    }
  }

  await repository.updateRun(run);

  return NextResponse.json({ redirectTo: `/runs/${run.id}/mapping` });
}
