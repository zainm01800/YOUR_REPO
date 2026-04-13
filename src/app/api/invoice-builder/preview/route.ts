import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getRepository } from "@/lib/data";
import {
  applyMappedRunToWorksheet,
  type InvoiceBuilderSourceField,
} from "@/lib/invoice-builder/template-workbook";

function getExcelColumnName(columnNumber: number) {
  let dividend = columnNumber;
  let columnName = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

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

  const { headerRowIndex, dataStartRow, lastVisibleRow } = applyMappedRunToWorksheet(
    sheet,
    rows,
    mappings,
  );

  const headerRow = sheet.getRow(headerRowIndex);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values : [];
  const columns = headerValues
    .slice(1)
    .map((value, index) => ({
      letter: getExcelColumnName(index + 1),
      label: String(value || "").trim(),
      index: index + 1,
    }))
    .filter((column) => column.label);

  const reportRows: string[][] = [];
  for (let rowIndex = dataStartRow; rowIndex <= lastVisibleRow; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    reportRows.push(columns.map((column) => row.getCell(column.index).text?.trim() || ""));
  }

  return NextResponse.json({
    sheetName: sheet.name,
    columns,
    reportRows,
  });
}
