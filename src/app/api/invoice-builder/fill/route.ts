import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getRepository } from "@/lib/data";
import {
  applyMappedRunToWorksheet,
  type InvoiceBuilderSourceField,
} from "@/lib/invoice-builder/template-workbook";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const templateFile = formData.get("template");
  const runId = formData.get("runId");
  const mappingsRaw = formData.get("mappings");

  if (
    !(templateFile instanceof File) ||
    typeof runId !== "string" ||
    typeof mappingsRaw !== "string"
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const mappings = JSON.parse(mappingsRaw) as Record<string, InvoiceBuilderSourceField>;
  const repository = await getRepository();
  const rows = await repository.getRunRows(runId);

  const arrayBuffer = await templateFile.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer as ExcelJS.Buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json({ error: "No worksheets found" }, { status: 400 });
  }

  applyMappedRunToWorksheet(sheet, rows, mappings);
  const outBuffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(outBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="filled-template.xlsx"',
    },
  });
}
