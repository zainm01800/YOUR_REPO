import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

/**
 * Find the row that contains the actual column headers.
 * Strategy: the header row is the first row (within the first 20) that has
 * the most non-empty string cells. We then peek at the row immediately after
 * to see if it's a "description" sub-header row (all strings, no numbers/dates)
 * and if so, the data starts one row later.
 */
function detectHeaderRow(sheet: ExcelJS.Worksheet): { headerRowIndex: number; dataStartRow: number } {
  let bestRow = 1;
  let bestCount = 0;

  for (let i = 1; i <= Math.min(20, sheet.rowCount); i++) {
    const row = sheet.getRow(i);
    let count = 0;
    row.eachCell((cell) => {
      if (cell.text?.trim()) count++;
    });
    if (count > bestCount) {
      bestCount = count;
      bestRow = i;
    }
  }

  // Check if the next row is a description row (all non-empty cells are strings, not numbers)
  const nextRowIndex = bestRow + 1;
  const nextRow = sheet.getRow(nextRowIndex);
  let nextRowCellCount = 0;
  let nextRowStringCount = 0;
  nextRow.eachCell((cell) => {
    const text = cell.text?.trim();
    if (text) {
      nextRowCellCount++;
      if (isNaN(Number(text))) nextRowStringCount++;
    }
  });

  const isDescriptionRow =
    nextRowCellCount >= 3 && nextRowStringCount === nextRowCellCount;

  const dataStartRow = isDescriptionRow ? bestRow + 2 : bestRow + 1;

  return { headerRowIndex: bestRow, dataStartRow };
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(arrayBuffer as any);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json({ error: "No worksheets found in file" }, { status: 400 });
  }

  const { headerRowIndex, dataStartRow } = detectHeaderRow(sheet);
  const headerRow = sheet.getRow(headerRowIndex);
  const headers: string[] = [];

  headerRow.eachCell((cell) => {
    const value = cell.text?.trim();
    if (value) headers.push(value);
  });

  const previewRows: string[][] = [];
  sheet.eachRow((row, rowIndex) => {
    if (rowIndex <= headerRowIndex || rowIndex > headerRowIndex + 3) return;
    const cells: string[] = [];
    row.eachCell((cell) => cells.push(cell.text?.trim() || ""));
    previewRows.push(cells);
  });

  return NextResponse.json({
    headers,
    previewRows,
    sheetName: sheet.name,
    headerRowIndex,
    dataStartRow,
  });
}
