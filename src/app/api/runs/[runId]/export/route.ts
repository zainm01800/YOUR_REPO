import JSZip from "jszip";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import type { ExportColumnLayout } from "@/lib/domain/types";
import { getRepository } from "@/lib/data";
import { createCsvExport } from "@/lib/export/csv";
import { createExcelExport } from "@/lib/export/excel";
import { normaliseExportLayout } from "@/lib/export/layout";
import {
  createPostingTemplateWorkbook,
  type PostingTemplateConfig,
} from "@/lib/export/posting-template";

function buildExportResponse(
  runId: string,
  format: string,
  payload: string | ArrayBuffer | Uint8Array,
) {
  const body =
    payload instanceof Uint8Array || payload instanceof ArrayBuffer
      ? payload
      : typeof payload === "string"
        ? payload
        : (new Uint8Array(
            (payload as any).buffer.slice(
              (payload as any).byteOffset,
              (payload as any).byteOffset + (payload as any).byteLength,
            ),
          ) as unknown as BodyInit);

  if (format === "zip") {
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${runId}-management-pack.zip"`,
      },
    });
  }

  if (format === "xlsx") {
    return new NextResponse(body, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${runId}.xlsx"`,
      },
    });
  }

  if (format === "template_xlsx") {
    return new NextResponse(body, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${runId}-posting-template.xlsx"`,
      },
    });
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${runId}.csv"`,
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "csv";
  const layout = normaliseExportLayout(
    url.searchParams.get("layout")
      ? (JSON.parse(url.searchParams.get("layout") as string) as ExportColumnLayout[])
      : undefined,
  );
  const repository = await getRepository();
  const [rows, run] = await Promise.all([
    repository.getRunRows(runId),
    repository.getRun(runId),
  ]);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (format === "xlsx") {
    const buffer = await createExcelExport(rows, layout);
    await repository.updateRun({
      ...run,
      exports: [
        {
          id: randomUUID(),
          format: "xlsx",
          fileName: `${runId}.xlsx`,
          createdAt: new Date().toISOString(),
        },
        ...run.exports,
      ],
    });
    return buildExportResponse(runId, format, buffer);
  }

  await repository.updateRun({
    ...run,
    exports: [
      {
        id: randomUUID(),
        format: "csv",
        fileName: `${runId}.csv`,
        createdAt: new Date().toISOString(),
      },
      ...run.exports,
    ],
  });
  return buildExportResponse(runId, format, createCsvExport(rows, layout));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const body = (await request.json()) as {
    format?: "csv" | "xlsx" | "template_xlsx";
    layout?: ExportColumnLayout[];
    templateWorkbookBase64?: string;
    postingTemplate?: PostingTemplateConfig;
  };
  const format = body.format || "csv";
  const layout = normaliseExportLayout(body.layout);
  const repository = await getRepository();
  const [rows, run] = await Promise.all([
    repository.getRunRows(runId),
    repository.getRun(runId),
  ]);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (format === "management_pack" as any) {
    const zip = new JSZip();
    
    // 1. Add Data Export (Excel)
    const excelBuffer = await createExcelExport(rows, layout);
    zip.file("reconciled-data.xlsx", excelBuffer);
    
    // 2. Add Reports (Mocking P&L and Balance Sheet for the pack)
    // In a full implementation, these would be separate curated workbooks
    zip.file("financial-summary.txt", "ClearMatch Period Management Pack\nRun: " + run.name + "\nDate: " + new Date().toLocaleDateString());

    // 3. Add Documents folder with manifest
    const docsFolder = zip.folder("supporting-documents");
    if (docsFolder) {
      const docManifest = run.transactions
        .filter(t => t.sourceBankTransactionId)
        .map(t => `- ${t.merchant}: ${t.amount} ${t.currency}`)
        .join("\n");
      docsFolder.file("manifest.txt", "Documents included in this reconciliation run:\n\n" + docManifest);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    
    await repository.updateRun({
      ...run,
      exports: [
        {
          id: randomUUID(),
          format: "zip",
          fileName: `${runId}-management-pack.zip`,
          createdAt: new Date().toISOString(),
        },
        ...run.exports,
      ],
    });

    return buildExportResponse(runId, "zip", zipBuffer);
  }

  if (format === "template_xlsx") {
    if (!body.templateWorkbookBase64 || !body.postingTemplate) {
      return NextResponse.json(
        { error: "Template workbook and posting configuration are required." },
        { status: 400 },
      );
    }

    const workbookBase64 = body.templateWorkbookBase64.includes(",")
      ? body.templateWorkbookBase64.split(",").at(-1) || ""
      : body.templateWorkbookBase64;
    const buffer = Buffer.from(workbookBase64, "base64");
    const workbook = await createPostingTemplateWorkbook(
      rows,
      buffer,
      body.postingTemplate,
    );

    await repository.updateRun({
      ...run,
      exports: [
        {
          id: randomUUID(),
          format: "xlsx",
          fileName: `${runId}-posting-template.xlsx`,
          createdAt: new Date().toISOString(),
        },
        ...run.exports,
      ],
    });

    return buildExportResponse(runId, format, workbook);
  }

  if (format === "xlsx") {
    const workbook = await createExcelExport(rows, layout);
    await repository.updateRun({
      ...run,
      exports: [
        {
          id: randomUUID(),
          format: "xlsx",
          fileName: `${runId}.xlsx`,
          createdAt: new Date().toISOString(),
        },
        ...run.exports,
      ],
    });
    return buildExportResponse(runId, format, workbook);
  }

  await repository.updateRun({
    ...run,
    exports: [
      {
        id: randomUUID(),
        format: "csv",
        fileName: `${runId}.csv`,
        createdAt: new Date().toISOString(),
      },
      ...run.exports,
    ],
  });
  return buildExportResponse(runId, format, createCsvExport(rows, layout));
}
