import { NextResponse } from "next/server";
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
    typeof payload === "string"
      ? payload
      : (new Uint8Array(
          payload instanceof ArrayBuffer
            ? payload
            : payload.buffer.slice(
                payload.byteOffset,
                payload.byteOffset + payload.byteLength,
              ),
        ) as unknown as BodyInit);

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
  const repository = getRepository();
  const rows = await repository.getRunRows(runId);

  if (format === "xlsx") {
    const buffer = await createExcelExport(rows, layout);
    return buildExportResponse(runId, format, buffer);
  }

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
  const repository = getRepository();
  const rows = await repository.getRunRows(runId);

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

    return buildExportResponse(runId, format, workbook);
  }

  if (format === "xlsx") {
    return buildExportResponse(runId, format, await createExcelExport(rows, layout));
  }

  return buildExportResponse(runId, format, createCsvExport(rows, layout));
}
