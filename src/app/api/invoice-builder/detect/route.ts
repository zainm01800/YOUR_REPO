import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

function makeUniqueHeaderLabel(baseHeader: string, columnNumber: number, seen: Map<string, number>) {
  const nextCount = (seen.get(baseHeader) || 0) + 1;
  seen.set(baseHeader, nextCount);

  if (nextCount === 1) {
    return baseHeader;
  }

  return `${baseHeader} [COL ${columnNumber}]`;
}

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

function getLastPopulatedRow(sheet: ExcelJS.Worksheet, dataStartRow: number, columns: Array<{ columnNumber: number }>) {
  for (let rowIndex = sheet.rowCount; rowIndex >= dataStartRow; rowIndex -= 1) {
    const row = sheet.getRow(rowIndex);
    const hasValue = columns.some((column) => row.getCell(column.columnNumber).text?.trim());
    if (hasValue) {
      return rowIndex;
    }
  }

  return dataStartRow;
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
  const columns: Array<{
    id: string;
    label: string;
    columnNumber: number;
    letter: string;
  }> = [];
  const seenHeaders = new Map<string, number>();

  headerRow.eachCell((cell, columnNumber) => {
    const value = cell.text?.trim();
    if (value) {
      const label = makeUniqueHeaderLabel(value, columnNumber, seenHeaders);
      headers.push(label);
      columns.push({
        id: label,
        label,
        columnNumber,
        letter: getExcelColumnName(columnNumber),
      });
    }
  });

  const lastPopulatedRow = getLastPopulatedRow(sheet, dataStartRow, columns);
  const previewRows: string[][] = [];
  for (let rowIndex = dataStartRow; rowIndex <= lastPopulatedRow; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    previewRows.push(
      columns.map((column) => row.getCell(column.columnNumber).text?.trim() || ""),
    );
  }

  return NextResponse.json({
    headers,
    columns,
    previewRows,
    sheetName: sheet.name,
    headerRowIndex,
    dataStartRow,
    lastPopulatedRow,
  });
}
