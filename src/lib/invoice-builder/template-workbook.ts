import ExcelJS from "exceljs";
import type { ReviewRow } from "@/lib/domain/types";

export type InvoiceBuilderSourceField =
  | "supplier"
  | "date"
  | "currency"
  | "originalAmount"
  | "gross"
  | "net"
  | "vat"
  | "vatPercent"
  | "vatCode"
  | "glCode"
  | "employee"
  | "originalDescription"
  | "approved";

export function detectHeaderRow(sheet: ExcelJS.Worksheet): {
  headerRowIndex: number;
  dataStartRow: number;
} {
  let bestRow = 1;
  let bestCount = 0;

  for (let rowIndex = 1; rowIndex <= Math.min(20, sheet.rowCount); rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    let count = 0;
    row.eachCell((cell) => {
      if (cell.text?.trim()) {
        count += 1;
      }
    });

    if (count > bestCount) {
      bestCount = count;
      bestRow = rowIndex;
    }
  }

  const nextRow = sheet.getRow(bestRow + 1);
  let nextRowCellCount = 0;
  let nextRowStringCount = 0;

  nextRow.eachCell((cell) => {
    const text = cell.text?.trim();
    if (text) {
      nextRowCellCount += 1;
      if (Number.isNaN(Number(text))) {
        nextRowStringCount += 1;
      }
    }
  });

  const isDescriptionRow = nextRowCellCount >= 3 && nextRowStringCount === nextRowCellCount;

  return {
    headerRowIndex: bestRow,
    dataStartRow: isDescriptionRow ? bestRow + 2 : bestRow + 1,
  };
}

export function getLastPopulatedRow(
  sheet: ExcelJS.Worksheet,
  dataStartRow: number,
  populatedColumns: number[],
) {
  for (let rowIndex = sheet.rowCount; rowIndex >= dataStartRow; rowIndex -= 1) {
    const row = sheet.getRow(rowIndex);
    const hasValue = populatedColumns.some((columnNumber) => row.getCell(columnNumber).text?.trim());
    if (hasValue) {
      return rowIndex;
    }
  }

  return dataStartRow;
}

export function getMappedColumnNumber(
  templateHeader: string,
  headerPositions: Record<string, number>,
) {
  const directMatch = headerPositions[templateHeader];
  if (directMatch) {
    return directMatch;
  }

  const columnMatch = templateHeader.match(/\[COL\s+(\d+)\]$/i);
  if (columnMatch) {
    return Number(columnMatch[1]);
  }

  return undefined;
}

function cloneValue<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value) as T;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "object") {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  return value;
}

export function copyTemplateRow(
  worksheet: ExcelJS.Worksheet,
  sourceRowNumber: number,
  targetRowNumber: number,
) {
  const sourceRow = worksheet.getRow(sourceRowNumber);
  const targetRow = worksheet.getRow(targetRowNumber);
  targetRow.height = sourceRow.height;
  targetRow.hidden = sourceRow.hidden;

  for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
    const sourceCell = sourceRow.getCell(columnIndex);
    const targetCell = targetRow.getCell(columnIndex);
    targetCell.style = JSON.parse(JSON.stringify(sourceCell.style));
    targetCell.numFmt = sourceCell.numFmt;
    targetCell.value = cloneValue(sourceCell.value);
  }
}

export function clearRowValues(worksheet: ExcelJS.Worksheet, rowNumber: number) {
  const row = worksheet.getRow(rowNumber);
  for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
    row.getCell(columnIndex).value = null;
  }
  row.commit();
}

export function getReviewRowValue(row: ReviewRow, field: InvoiceBuilderSourceField) {
  switch (field) {
    case "supplier":
      return row.supplier;
    case "date": {
      if (!row.date) {
        return null;
      }

      const parsedDate = new Date(row.date);
      return Number.isNaN(parsedDate.getTime()) ? row.date : parsedDate;
    }
    case "currency":
      return row.currency;
    case "originalAmount":
      return row.originalAmount;
    case "gross":
      return row.gross ?? null;
    case "net":
      return row.net ?? null;
    case "vat":
      return row.vat ?? null;
    case "vatPercent":
      return row.vatPercent ?? null;
    case "vatCode":
      return row.vatCode ?? "";
    case "glCode":
      return row.glCode ?? "";
    case "employee":
      return row.employee ?? "";
    case "originalDescription":
      return row.originalDescription ?? "";
    case "approved":
      return row.approved ? "Yes" : "No";
  }
}

export function applyMappedRunToWorksheet(
  sheet: ExcelJS.Worksheet,
  rows: ReviewRow[],
  mappings: Record<string, InvoiceBuilderSourceField>,
) {
  const { headerRowIndex, dataStartRow } = detectHeaderRow(sheet);
  const headerRow = sheet.getRow(headerRowIndex);
  const headerPositions: Record<string, number> = {};
  const populatedColumns: number[] = [];

  headerRow.eachCell((cell, columnNumber) => {
    const text = cell.text?.trim();
    if (text) {
      headerPositions[text] = columnNumber;
      populatedColumns.push(columnNumber);
    }
  });

  const lastPopulatedRow = getLastPopulatedRow(sheet, dataStartRow, populatedColumns);
  const templateRowCount = Math.max(1, lastPopulatedRow - dataStartRow + 1);
  const writeableRows = rows.filter((row) => !row.excludedFromExport);
  const outputRowCount = writeableRows.length;
  const finalRowCount = Math.max(templateRowCount, outputRowCount);
  const mappedColumns = Object.entries(mappings)
    .map(([templateHeader, sourceField]) => ({
      columnNumber: getMappedColumnNumber(templateHeader, headerPositions),
      sourceField,
    }))
    .filter(
      (
        entry,
      ): entry is {
        columnNumber: number;
        sourceField: InvoiceBuilderSourceField;
      } => Boolean(entry.columnNumber),
    );

  for (let offset = 0; offset < finalRowCount; offset += 1) {
    const targetRowNumber = dataStartRow + offset;

    if (offset < outputRowCount) {
      const sourceTemplateRowNumber = dataStartRow + Math.min(offset, templateRowCount - 1);
      const reviewRow = writeableRows[offset];
      copyTemplateRow(sheet, sourceTemplateRowNumber, targetRowNumber);

      const targetRow = sheet.getRow(targetRowNumber);
      for (const { columnNumber, sourceField } of mappedColumns) {
        targetRow.getCell(columnNumber).value = getReviewRowValue(reviewRow, sourceField);
      }
      targetRow.commit();
      continue;
    }

    clearRowValues(sheet, targetRowNumber);
  }

  return {
    headerRowIndex,
    dataStartRow,
    lastVisibleRow: dataStartRow + finalRowCount - 1,
  };
}
