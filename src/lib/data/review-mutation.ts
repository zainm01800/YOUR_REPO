import type {
  ReconciliationRun,
  ReviewAction,
} from "@/lib/domain/types";
import type {
  ReviewMutationInput,
  ReviewMutationResult,
} from "@/lib/data/repository";
import { inferCountryCodeFromTextOrCurrency } from "@/lib/uploads/country-inference";

function parseOptionalNumber(value?: string) {
  if (!value?.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function recomputeDocumentFromTaxLines(document?: ReconciliationRun["documents"][number]) {
  if (!document || document.taxLines.length === 0) {
    return;
  }

  document.net = Number(
    document.taxLines.reduce((sum, taxLine) => sum + taxLine.netAmount, 0).toFixed(2),
  );
  document.vat = Number(
    document.taxLines.reduce((sum, taxLine) => sum + taxLine.taxAmount, 0).toFixed(2),
  );
  document.gross = Number(
    document.taxLines.reduce((sum, taxLine) => sum + taxLine.grossAmount, 0).toFixed(2),
  );
  document.vatRateSummary = document.taxLines
    .map((taxLine) => `${taxLine.rate.toFixed(1)}%`)
    .join(", ");
}

function syncTaxLineFromDocument(
  document: ReconciliationRun["documents"][number] | undefined,
  taxLineId?: string,
) {
  const targetTaxLine = taxLineId
    ? document?.taxLines.find((taxLine) => taxLine.id === taxLineId)
    : document?.taxLines[0];

  if (!document || !targetTaxLine) {
    return;
  }

  if (document.taxLines.length === 1) {
    targetTaxLine.taxAmount = document.vat || 0;
    targetTaxLine.netAmount = document.net || 0;
    targetTaxLine.grossAmount = document.gross || 0;
    targetTaxLine.rate =
      document.net && document.vat !== undefined
        ? Number(((document.vat / document.net) * 100).toFixed(1))
        : 0;
  } else {
    recomputeDocumentFromTaxLines(document);
  }
}

function createReviewLinkedMatch(
  transactionId: string,
  documentId?: string,
  status: "matched" | "probable_match" | "unmatched" = "matched",
) {
  return {
    id: `match_${Date.now()}`,
    transactionId,
    documentId,
    status,
    score: status === "matched" ? 90 : status === "probable_match" ? 70 : 0,
    selected: true,
    rationale: {
      amountScore: status === "matched" ? 40 : 25,
      dateScore: 15,
      supplierScore: 15,
      filenameScore: 5,
      employeeScore: 0,
      currencyScore: 5,
      invoiceNumberScore: 0,
      referenceScore: 0,
      notes: ["Updated during review workspace."],
    },
  } satisfies ReconciliationRun["matches"][number];
}

function getLinkStatus(transactionAmount: number, documentGross?: number) {
  if (documentGross === undefined) {
    return "unmatched" as const;
  }

  return Math.abs(transactionAmount - documentGross) <= 1.5
    ? ("matched" as const)
    : ("probable_match" as const);
}

export function applyReviewMutationToRun(
  run: ReconciliationRun,
  input: ReviewMutationInput,
  actorName: string,
): ReviewMutationResult {
  const transaction = run.transactions.find(
    (candidate) =>
      input.rowId === `row_${candidate.id}` ||
      input.rowId.startsWith(`row_${candidate.id}__tax_`),
  );
  const rowTaxLineId = input.rowId.match(/__tax_(.+)$/)?.[1];
  const selectedMatch = transaction
    ? run.matches.find(
        (candidate) =>
          candidate.transactionId === transaction.id && candidate.selected,
      )
    : undefined;
  const document = selectedMatch?.documentId
    ? run.documents.find((candidate) => candidate.id === selectedMatch.documentId)
    : undefined;
  const result: ReviewMutationResult = {
    affectedTransactionIds: transaction ? [transaction.id] : [],
  };

  if (transaction && input.actionType === "edit_field" && input.field) {
    switch (input.field) {
      case "supplier":
        if (document) {
          document.supplier = input.value;
        } else if (input.value) {
          transaction.merchant = input.value;
        }
        break;
      case "originalValue": {
        const nextOriginalAmount = parseOptionalNumber(input.value);
        if (nextOriginalAmount !== undefined) {
          transaction.amount = nextOriginalAmount;
        }
        break;
      }
      case "date":
        if (document) {
          document.issueDate = input.value;
        } else if (input.value) {
          transaction.transactionDate = input.value;
        }
        break;
      case "countryCode":
        if (document) {
          document.countryCode = input.value?.trim().toUpperCase() || undefined;
        }
        break;
      case "gross": {
        const nextGross = parseOptionalNumber(input.value);
        if (document) {
          const targetTaxLine = rowTaxLineId
            ? document.taxLines.find((taxLine) => taxLine.id === rowTaxLineId)
            : document.taxLines[0];
          if (targetTaxLine && document.taxLines.length > 1 && nextGross !== undefined) {
            targetTaxLine.grossAmount = nextGross;
            targetTaxLine.netAmount = Number((nextGross - targetTaxLine.taxAmount).toFixed(2));
            recomputeDocumentFromTaxLines(document);
          } else {
            document.gross = nextGross;
            if (nextGross !== undefined && document.vat !== undefined) {
              document.net = Number((nextGross - document.vat).toFixed(2));
            }
            syncTaxLineFromDocument(document, rowTaxLineId);
          }
        } else if (nextGross !== undefined) {
          transaction.amount = nextGross;
        }
        break;
      }
      case "net": {
        const nextNet = parseOptionalNumber(input.value);
        if (document) {
          const targetTaxLine = rowTaxLineId
            ? document.taxLines.find((taxLine) => taxLine.id === rowTaxLineId)
            : document.taxLines[0];
          if (targetTaxLine && document.taxLines.length > 1 && nextNet !== undefined) {
            targetTaxLine.netAmount = nextNet;
            targetTaxLine.taxAmount = Number((nextNet * (targetTaxLine.rate / 100)).toFixed(2));
            targetTaxLine.grossAmount = Number((targetTaxLine.netAmount + targetTaxLine.taxAmount).toFixed(2));
            recomputeDocumentFromTaxLines(document);
          } else {
            document.net = nextNet;
            if (document.gross !== undefined && nextNet !== undefined) {
              document.vat = Number((document.gross - nextNet).toFixed(2));
            }
            syncTaxLineFromDocument(document, rowTaxLineId);
          }
        }
        break;
      }
      case "vat": {
        const nextVat = parseOptionalNumber(input.value);
        if (document) {
          const targetTaxLine = rowTaxLineId
            ? document.taxLines.find((taxLine) => taxLine.id === rowTaxLineId)
            : document.taxLines[0];
          if (targetTaxLine && document.taxLines.length > 1 && nextVat !== undefined) {
            targetTaxLine.taxAmount = nextVat;
            targetTaxLine.grossAmount = Number((targetTaxLine.netAmount + nextVat).toFixed(2));
            recomputeDocumentFromTaxLines(document);
          } else {
            document.vat = nextVat;
            if (document.gross !== undefined && nextVat !== undefined) {
              document.net = Number((document.gross - nextVat).toFixed(2));
            }
            syncTaxLineFromDocument(document, rowTaxLineId);
          }
        }
        break;
      }
      case "vatPercent": {
        const nextRate = parseOptionalNumber(input.value);
        if (document && nextRate !== undefined) {
          const targetTaxLine = rowTaxLineId
            ? document.taxLines.find((taxLine) => taxLine.id === rowTaxLineId)
            : document.taxLines[0];
          if (targetTaxLine) {
            targetTaxLine.rate = nextRate;
          }

          if (targetTaxLine && document.taxLines.length > 1) {
            targetTaxLine.taxAmount = Number((targetTaxLine.netAmount * (nextRate / 100)).toFixed(2));
            targetTaxLine.grossAmount = Number((targetTaxLine.netAmount + targetTaxLine.taxAmount).toFixed(2));
            recomputeDocumentFromTaxLines(document);
          } else if (document.net !== undefined) {
            document.vat = Number((document.net * (nextRate / 100)).toFixed(2));
            document.gross = Number(((document.net || 0) + (document.vat || 0)).toFixed(2));
          } else if (document.gross !== undefined) {
            document.net = Number((document.gross / (1 + nextRate / 100)).toFixed(2));
            document.vat = Number((document.gross - document.net).toFixed(2));
          }
          syncTaxLineFromDocument(document, rowTaxLineId);
        }
        break;
      }
      case "glCode":
        transaction.glCode = input.value;
        break;
      case "vatCode":
        transaction.vatCode = input.value;
        break;
      case "originalDescription":
        transaction.description = input.value || "";
        break;
      case "notes":
        if (selectedMatch) {
          selectedMatch.rationale.notes = input.value ? [input.value] : [];
        }
        break;
    }
  }

  if (transaction && input.actionType === "override_gl_code" && input.value) {
    transaction.glCode = input.value;
  }

  if (transaction && input.actionType === "override_vat_code" && input.value) {
    transaction.vatCode = input.value;
  }

  if (transaction && input.actionType === "rematch") {
    const incomingDocuments = (
      Array.isArray(input.payload?.newDocuments)
        ? (input.payload?.newDocuments as Array<{
            clientId?: string;
            fileName?: string;
            supplier?: string;
            issueDate?: string;
            gross?: number;
            net?: number;
            vat?: number;
            currency?: string;
            rawExtractedText?: string;
            confidence?: number;
            taxLines?: Array<{
              label?: string;
              netAmount?: number;
              taxAmount?: number;
              grossAmount?: number;
              rate?: number;
              recoverable?: boolean;
              vatCode?: string;
            }>;
          }>)
        : input.payload?.newDocument
          ? [
              input.payload.newDocument as {
                clientId?: string;
                fileName?: string;
                supplier?: string;
                issueDate?: string;
                gross?: number;
                net?: number;
                vat?: number;
                currency?: string;
                rawExtractedText?: string;
                confidence?: number;
                taxLines?: Array<{
                  label?: string;
                  netAmount?: number;
                  taxAmount?: number;
                  grossAmount?: number;
                  rate?: number;
                  recoverable?: boolean;
                  vatCode?: string;
                }>;
              },
            ]
          : []
    ).filter((candidate) => candidate.fileName);
    const selectedUploadedDocumentId =
      typeof input.payload?.selectedUploadedDocumentId === "string"
        ? (input.payload.selectedUploadedDocumentId as string)
        : undefined;
    let nextDocumentId =
      typeof input.payload?.documentId === "string"
        ? (input.payload.documentId as string)
        : undefined;

    if (incomingDocuments.length > 0) {
      const createdDocuments = incomingDocuments.map((incomingDocument, index) => {
        const gross =
          typeof incomingDocument.gross === "number" ? incomingDocument.gross : undefined;
        const vat =
          typeof incomingDocument.vat === "number" ? incomingDocument.vat : undefined;
        const net =
          typeof incomingDocument.net === "number"
            ? incomingDocument.net
            : gross !== undefined && vat !== undefined
              ? Number((gross - vat).toFixed(2))
              : gross;
        const incomingTaxLines =
          Array.isArray(incomingDocument.taxLines) && incomingDocument.taxLines.length > 0
            ? incomingDocument.taxLines
                .map((taxLine, taxLineIndex) => {
                  if (
                    typeof taxLine.netAmount !== "number" ||
                    typeof taxLine.taxAmount !== "number" ||
                    typeof taxLine.grossAmount !== "number" ||
                    typeof taxLine.rate !== "number"
                  ) {
                    return null;
                  }

                  return {
                    id: `tax_manual_${Date.now()}_${index}_${taxLineIndex}`,
                    label:
                      taxLine.label ||
                      `Manual review attachment ${taxLineIndex + 1}`,
                    netAmount: taxLine.netAmount,
                    taxAmount: taxLine.taxAmount,
                    grossAmount: taxLine.grossAmount,
                    rate: taxLine.rate,
                    recoverable: taxLine.recoverable ?? true,
                    vatCode: taxLine.vatCode,
                  };
                })
                .filter(
                  (
                    taxLine,
                  ): taxLine is NonNullable<typeof taxLine> => Boolean(taxLine),
                )
            : [];
        const createdDocument: ReconciliationRun["documents"][number] = {
          id: `doc_manual_${Date.now()}_${index}`,
          fileName: incomingDocument.fileName || `upload_${index + 1}`,
          supplier: incomingDocument.supplier || transaction.merchant,
          issueDate: incomingDocument.issueDate || transaction.transactionDate,
          gross,
          net,
          vat,
          vatRateSummary:
            net && vat !== undefined ? `${((vat / net) * 100).toFixed(1)}%` : "0%",
          documentNumber: (incomingDocument.fileName || `upload_${index + 1}`)
            .replace(/\.[^.]+$/, "")
            .toUpperCase(),
          countryCode: inferCountryCodeFromTextOrCurrency(
            incomingDocument.rawExtractedText || "",
            incomingDocument.currency || transaction.currency,
          ),
          currency: incomingDocument.currency || transaction.currency,
          rawExtractedText: incomingDocument.rawExtractedText || "Added during review.",
          confidence: incomingDocument.confidence ?? 0.78,
          duplicateFingerprint: `manual-${Date.now()}-${index}`,
          taxLines:
            incomingTaxLines.length > 0
              ? incomingTaxLines
              : gross
                ? [
                    {
                      id: `tax_manual_${Date.now()}_${index}`,
                      label: "Manual review attachment",
                      netAmount: net || gross,
                      taxAmount: vat || 0,
                      grossAmount: gross,
                      rate:
                        net && vat !== undefined
                          ? Number(((vat / net) * 100).toFixed(1))
                          : 0,
                      recoverable: true,
                    },
                  ]
                : [],
        };

        recomputeDocumentFromTaxLines(createdDocument);
        run.documents.unshift(createdDocument);
        run.uploadedFiles.unshift({
          id: `file_doc_${Date.now()}_${index}`,
          fileName: createdDocument.fileName,
          originalName: createdDocument.fileName,
          mimeType: "application/octet-stream",
          sizeBytes: 0,
          fileKind: "document",
        });

        return {
          clientId: incomingDocument.clientId,
          documentId: createdDocument.id,
          document: createdDocument,
        };
      });

      const affectedTransactionIds = new Set<string>(result.affectedTransactionIds);

      for (const createdDocument of createdDocuments) {
        const merchant =
          createdDocument.document.supplier ||
          createdDocument.document.fileName.replace(/\.[^.]+$/, "");
        const syntheticTransactionId = `txn_review_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const syntheticTransaction = {
          id: syntheticTransactionId,
          externalId: undefined,
          sourceLineNumber: undefined,
          transactionDate:
            createdDocument.document.issueDate || new Date().toISOString().slice(0, 10),
          postedDate: createdDocument.document.issueDate,
          amount: createdDocument.document.gross || 0,
          currency:
            createdDocument.document.currency ||
            run.defaultCurrency ||
            "GBP",
          merchant,
          description: merchant,
          employee: undefined,
          reference: createdDocument.document.documentNumber,
          vatCode: undefined,
          glCode: undefined,
          noReceiptRequired: false,
          excludedFromExport: false,
        } satisfies ReconciliationRun["transactions"][number];

        run.transactions.unshift(syntheticTransaction);
        run.matches.unshift({
          id: `match_${syntheticTransactionId}_${createdDocument.documentId}`,
          transactionId: syntheticTransactionId,
          documentId: createdDocument.documentId,
          status: "matched",
          score: 95,
          selected: true,
          rationale: {
            amountScore: 40,
            dateScore: 20,
            supplierScore: 20,
            filenameScore: 10,
            employeeScore: 0,
            currencyScore: 5,
            invoiceNumberScore: 0,
            referenceScore: 0,
            notes: ["Created from a document uploaded during review."],
          },
        });
        affectedTransactionIds.add(syntheticTransactionId);

        if (createdDocument.clientId === selectedUploadedDocumentId) {
          nextDocumentId = createdDocument.documentId;
          result.linkedDocumentId = createdDocument.documentId;
        }
      }

      if (!result.linkedDocumentId && nextDocumentId) {
        result.linkedDocumentId = nextDocumentId;
      }

      result.affectedTransactionIds = [...affectedTransactionIds];
    }

    if (incomingDocuments.length === 0) {
      run.matches.forEach((candidate) => {
        if (candidate.transactionId === transaction.id) {
          candidate.selected = false;
        }
      });

      const linkedDocument = nextDocumentId
        ? run.documents.find((candidate) => candidate.id === nextDocumentId)
        : undefined;
      const nextStatus = getLinkStatus(transaction.amount, linkedDocument?.gross);
      const currentMatch = run.matches.find(
        (candidate) => candidate.transactionId === transaction.id,
      );

      if (currentMatch) {
        currentMatch.selected = true;
        currentMatch.documentId = nextDocumentId;
        currentMatch.status = nextStatus;
        currentMatch.score = nextStatus === "matched" ? 90 : nextStatus === "probable_match" ? 70 : 0;
        currentMatch.rationale.notes = ["Updated during review workspace."];
      } else {
        run.matches.push(
          createReviewLinkedMatch(transaction.id, nextDocumentId, nextStatus),
        );
      }

      result.linkedDocumentId = nextDocumentId;
    }
  }

  if (transaction && input.actionType === "exclude_from_export") {
    transaction.excludedFromExport = true;
  }

  if (transaction && input.actionType === "no_receipt_required") {
    transaction.noReceiptRequired = true;
  }

  const action: ReviewAction = {
    id: `audit_${Date.now()}`,
    runId: run.id,
    actionType: input.actionType,
    field:
      input.actionType === "override_gl_code"
        ? "glCode"
        : input.actionType === "override_vat_code"
          ? "vatCode"
          : input.actionType === "edit_field"
            ? input.field
            : undefined,
    afterValue: input.value,
    note: input.note,
    createdAt: new Date().toISOString(),
    actorName,
  };

  run.auditTrail.unshift(action);
  return result;
}
