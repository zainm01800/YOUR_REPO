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
  extractDocumentFromTextWithAI,
} from "@/lib/uploads/extractor";
import type { ClientExtractedDocumentInput, ExtractedDocument, TransactionRecord } from "@/lib/domain/types";

/** Quick check: does this OCR text contain any money-like numbers? */
function findMoneyValuesFromText(text: string): number[] {
  const stripped = text.replace(/\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/g, "");
  const found = new Set<number>();
  for (const m of stripped.matchAll(/(?:^|[\s£$€,]|\b)(\d{1,6}[.,]\d{2})(?:\b|$)/gm)) {
    const v = Number(m[1].replace(",", "."));
    if (v > 0) found.add(v);
  }
  for (const m of stripped.matchAll(/[£$€]\s*(\d{2,6})(?!\s*[.,]\d)/g)) {
    const v = Number(m[1]);
    if (v > 0) found.add(v);
  }
  return Array.from(found);
}

/** Guess whether a string looks like a raw filename / hash rather than a real company name. */
function looksLikeFilename(name: string): boolean {
  // e.g. "67e13fe6f3f7fdecaaa315f2_64f9d4addd" or "invoice-template-u-750px"
  return /^[a-f0-9_\-]{20,}$/i.test(name) || /\.(pdf|jpg|jpeg|png|webp)$/i.test(name);
}

function transactionsFromDocuments(documents: ExtractedDocument[], fallbackCurrency: string): TransactionRecord[] {
  return documents.map((doc, index) => {
    // Use the best available amount — gross is preferred, fall back to net+vat or net
    const amount =
      (doc.gross != null && doc.gross > 0 ? doc.gross : undefined) ??
      (doc.net != null && doc.net > 0 && doc.vat != null
        ? roundMoney(doc.net + doc.vat)
        : undefined) ??
      (doc.net != null && doc.net > 0 ? doc.net : undefined) ??
      0;

    // Prefer a real supplier name; avoid raw filenames/hashes as the merchant
    const rawSupplier = doc.supplier ?? "";
    const merchant = rawSupplier && !looksLikeFilename(rawSupplier)
      ? rawSupplier
      : `Document ${index + 1}`;

    return {
      id: `txn_doc_${index + 1}_${doc.id}`,
      sourceLineNumber: index + 1,
      transactionDate: doc.issueDate,
      amount,
      currency: doc.currency ?? fallbackCurrency,
      merchant,
      description: doc.documentNumber ?? doc.fileName,
      reference: doc.documentNumber,
    };
  });
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export async function GET() {
  const repository = getRepository();
  const snapshot = await repository.getDashboardSnapshot();
  return NextResponse.json(snapshot.runs);
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (err) {
    console.error("[POST /api/runs] Unhandled error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function handlePost(request: Request) {
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

  // Use AI extraction for client-side OCR results (images OCR'd by Tesseract in browser)
  const aiExtractedClientDocs = await Promise.all(
    clientExtractedDocuments.map((document) =>
      extractDocumentFromTextWithAI(
        document.fileName,
        document.mimeType,
        document.rawExtractedText ?? "",
        document.confidence ?? 0.68,
      ),
    ),
  );
  run.documents.push(...aiExtractedClientDocs);

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
      try {
        const expanded = await expandArchive(entry.name, await entry.arrayBuffer());
        for (const item of expanded) {
          if (clientExtractedNames.has(item.fileName)) {
            continue;
          }
          try {
            const extracted = await extractDocumentFromBuffer(
              item.fileName,
              item.mimeType,
              item.buffer,
            );
            run.documents.push(extracted);
          } catch (err) {
            console.error(`[runs/route] extractDocumentFromBuffer failed for ${item.fileName}:`, err);
          }
        }
      } catch (err) {
        console.error(`[runs/route] expandArchive failed for ${entry.name}:`, err);
      }
    } else {
      // Check if this file was already OCR'd by the browser
      const clientDoc = clientExtractedDocuments.find((d) => d.fileName === entry.name);
      const ocrHadNumbers = clientDoc && findMoneyValuesFromText(clientDoc.rawExtractedText ?? "").length > 0;

      if (clientDoc && ocrHadNumbers) {
        // Good OCR result — already pushed above, skip server-side
        continue;
      }

      // Low-confidence or empty OCR — try server-side vision extraction
      try {
        const extracted = await extractDocumentFromBuffer(
          entry.name,
          entry.type,
          await entry.arrayBuffer(),
        );

        if (clientDoc) {
          // Replace the poor OCR result with the better vision result (if it found amounts)
          if (extracted.gross != null && extracted.gross > 0) {
            const idx = run.documents.findIndex((d) => d.fileName === clientDoc.fileName);
            if (idx >= 0) {
              run.documents[idx] = extracted;
            } else {
              run.documents.push(extracted);
            }
          }
        } else {
          run.documents.push(extracted);
        }
      } catch (err) {
        console.error(`[runs/route] extractDocumentFromBuffer failed for ${entry.name}:`, err);
      }
    }
  }

  // If no transaction file was uploaded, synthesise one transaction per document
  // so receipt-only runs still produce a reviewable table.
  if (run.transactions.length === 0 && run.documents.length > 0) {
    run.transactions = transactionsFromDocuments(run.documents, defaultCurrency);
  }

  await repository.updateRun(run);

  return NextResponse.json({ redirectTo: `/runs/${run.id}/mapping` });
}
