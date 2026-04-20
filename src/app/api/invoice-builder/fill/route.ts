import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getRepository } from "@/lib/data";
import {
  applyMappedRunToWorksheet,
  type InvoiceBuilderSourceField,
} from "@/lib/invoice-builder/template-workbook";

const MAX_TEMPLATE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const templateFile = formData.get("template");
    const runId = formData.get("runId");
    const mappingsRaw = formData.get("mappings");

    if (
      !(templateFile instanceof File) ||
      typeof runId !== "string" ||
      typeof mappingsRaw !== "string"
    ) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (templateFile.size > MAX_TEMPLATE_BYTES) {
      return NextResponse.json({ error: "Template file exceeds the 20 MB limit." }, { status: 413 });
    }

    if (runId.length > 128) {
      return NextResponse.json({ error: "Invalid run ID." }, { status: 400 });
    }

    let mappings: Record<string, InvoiceBuilderSourceField>;
    try {
      mappings = JSON.parse(mappingsRaw) as Record<string, InvoiceBuilderSourceField>;
    } catch {
      return NextResponse.json({ error: "Invalid mappings JSON." }, { status: 400 });
    }

    const repository = await getRepository();
    const rows = await repository.getRunRows(runId);

    const arrayBuffer = await templateFile.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer as ExcelJS.Buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json({ error: "No worksheets found." }, { status: 400 });
    }

    applyMappedRunToWorksheet(sheet, rows, mappings);
    const outBuffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(outBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="filled-template.xlsx"',
      },
    });
  } catch (err) {
    console.error("[invoice-builder/fill] error:", err);
    return NextResponse.json({ error: "Failed to fill template." }, { status: 500 });
  }
}
