import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getRepository } from "@/lib/data";

const SOURCE_FIELDS = [
  "supplier", "date", "currency", "originalAmount", "gross",
  "net", "vat", "vatPercent", "vatCode", "glCode",
  "employee", "originalDescription", "approved",
] as const;

type SourceField = (typeof SOURCE_FIELDS)[number];

function getRowValue(row: Record<string, unknown>, field: SourceField): string {
  const v = row[field];
  if (v === undefined || v === null) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  return String(v);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const templateFile = formData.get("template");
  const runId = formData.get("runId");
  const mappingsRaw = formData.get("mappings");

  if (!(templateFile instanceof File) || typeof runId !== "string" || typeof mappingsRaw !== "string") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Parse column mappings: { templateHeader: sourceField }
  const mappings: Record<string, SourceField> = JSON.parse(mappingsRaw);

  const repository = getRepository();
  const rows = await repository.getRunRows(runId);
  const approvedRows = rows.filter((r) => !r.excludedFromExport);

  const arrayBuffer = await templateFile.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(arrayBuffer as any);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json({ error: "No worksheets found" }, { status: 400 });
  }

  // Read header row to get column positions
  const headerRow = sheet.getRow(1);
  const headerPositions: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const text = cell.text?.trim();
    if (text) headerPositions[text] = colNumber;
  });

  // Find the first data row (after header)
  const dataStartRow = 2;

  // Fill in rows
  approvedRows.forEach((reviewRow, index) => {
    const excelRowIndex = dataStartRow + index;
    const excelRow = sheet.getRow(excelRowIndex);

    Object.entries(mappings).forEach(([templateHeader, sourceField]) => {
      const colNumber = headerPositions[templateHeader];
      if (!colNumber) return;
      const value = getRowValue(reviewRow as unknown as Record<string, unknown>, sourceField);
      excelRow.getCell(colNumber).value = value;
    });

    excelRow.commit();
  });

  const outBuffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(outBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="filled-template.xlsx"`,
    },
  });
}
