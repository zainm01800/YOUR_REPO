import ExcelJS from "exceljs";
import type { ReviewRow } from "@/lib/domain/types";

export type PostingTemplateSourceField =
  | "source"
  | "supplier"
  | "date"
  | "currency"
  | "originalValue"
  | "gross"
  | "net"
  | "vat"
  | "vatPercent"
  | "vatCode"
  | "glCode"
  | "originalDescription"
  | "employee"
  | "notes";

export type PostingTemplateMapping = {
  columnKey: string;
  sourceType: "ignore" | "field" | "constant";
  sourceField?: PostingTemplateSourceField;
  constantValue?: string;
};

export type PostingTemplateColumn = {
  index: number;
  letter: string;
  key: string;
  label: string;
  sampleValue?: string;
};

export type PostingTemplateSheetPreview = {
  name: string;
  headerRow: number;
  labelRow: number;
  dataStartRow: number;
  columns: PostingTemplateColumn[];
};

export type PostingTemplateConfig = {
  sheetName: string;
  headerRow: number;
  dataStartRow: number;
  mappings: PostingTemplateMapping[];
};

function toNodeBuffer(workbookBuffer: Buffer | Uint8Array | ArrayBuffer) {
  if (Buffer.isBuffer(workbookBuffer)) {
    return workbookBuffer;
  }

  if (workbookBuffer instanceof ArrayBuffer) {
    return Buffer.from(workbookBuffer);
  }

  return Buffer.from(
    workbookBuffer.buffer,
    workbookBuffer.byteOffset,
    workbookBuffer.byteLength,
  );
}

type WorkbookLoadInput = Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];

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

function cloneStyle<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function detectHeaderRow(worksheet: ExcelJS.Worksheet) {
  let bestRow = 1;
  let bestScore = 0;

  for (let rowNumber = 1; rowNumber <= Math.min(worksheet.rowCount, 20); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const rawValues = Array.isArray(row.values) ? row.values : [];
    const values = rawValues
      .slice(1)
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const uppercaseLike = values.filter((value) => /^[A-Z0-9_]+$/.test(value)).length;
    const score = values.length + uppercaseLike * 2;

    if (score > bestScore) {
      bestScore = score;
      bestRow = rowNumber;
    }
  }

  return bestRow;
}

function extractWorksheetColumns(
  worksheet: ExcelJS.Worksheet,
  headerRowNumber: number,
  dataStartRowNumber: number,
) {
  const headerRow = worksheet.getRow(headerRowNumber);
  const labelRow = worksheet.getRow(headerRowNumber + 1);
  const sampleRow = worksheet.getRow(dataStartRowNumber);
  const columns: PostingTemplateColumn[] = [];

  for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
    const key = String(headerRow.getCell(columnIndex).text || "").trim();
    const label = String(labelRow.getCell(columnIndex).text || "").trim();

    if (!key && !label) {
      continue;
    }

    columns.push({
      index: columnIndex,
      letter: getExcelColumnName(columnIndex),
      key,
      label,
      sampleValue: String(sampleRow.getCell(columnIndex).text || "").trim() || undefined,
    });
  }

  return columns;
}

function suggestFieldFromColumn(column: PostingTemplateColumn): PostingTemplateMapping {
  const normalizedKey = column.key.replace(/[^A-Z0-9]/g, "");
  const normalizedLabel = column.label.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const reference = `${normalizedKey} ${normalizedLabel}`;

  if (reference.includes("DOCUMENTDATE")) {
    return { columnKey: column.key, sourceType: "field", sourceField: "date" };
  }

  if (reference.includes("POSTINGDATE")) {
    return { columnKey: column.key, sourceType: "field", sourceField: "date" };
  }

  if (reference.includes("DOCUMENTCURRENCY") || reference === "CURRENCY") {
    return { columnKey: column.key, sourceType: "field", sourceField: "currency" };
  }

  if (reference.includes("GROSS") || reference.includes("INVOICEAMOUNT")) {
    return { columnKey: column.key, sourceType: "field", sourceField: "gross" };
  }

  if (reference.includes("NET")) {
    return { columnKey: column.key, sourceType: "field", sourceField: "net" };
  }

  if (reference.includes("VATCODE") || reference.includes("TAXCODE")) {
    return { columnKey: column.key, sourceType: "field", sourceField: "vatCode" };
  }

  if (reference.includes("GL") || reference.includes("ACCOUNT")) {
    return { columnKey: column.key, sourceType: "field", sourceField: "glCode" };
  }

  if (reference.includes("HEADER") || reference.includes("REFERENCE")) {
    return {
      columnKey: column.key,
      sourceType: "field",
      sourceField: "originalDescription",
    };
  }

  if (reference.includes("PARTY") || reference.includes("SUPPLIER")) {
    return { columnKey: column.key, sourceType: "field", sourceField: "supplier" };
  }

  if (
    reference.includes("COMPANYCODE") ||
    reference.includes("TRANSACTIONTYPE") ||
    reference.includes("DOCUMENTTYPE")
  ) {
    return {
      columnKey: column.key,
      sourceType: "constant",
      constantValue: column.sampleValue || "",
    };
  }

  return { columnKey: column.key, sourceType: "ignore" };
}

function getPostingFieldValue(row: ReviewRow, sourceField: PostingTemplateSourceField) {
  switch (sourceField) {
    case "source":
      return row.source;
    case "supplier":
      return row.supplier;
    case "date":
      return row.date;
    case "currency":
      return row.currency;
    case "originalValue":
      return row.originalAmount;
    case "gross":
      return row.gross;
    case "net":
      return row.net;
    case "vat":
      return row.vat;
    case "vatPercent":
      return row.vatPercent !== undefined ? row.vatPercent / 100 : undefined;
    case "vatCode":
      return row.vatCode;
    case "glCode":
      return row.glCode;
    case "originalDescription":
      return row.originalDescription;
    case "employee":
      return row.employee;
    case "notes":
      return row.notes;
  }
}

function coerceExcelValue(value: string | number | undefined) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return parsedDate;
    }
  }

  return value;
}

function applyTemplateRowStyle(
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

    targetCell.style = cloneStyle(sourceCell.style);
    targetCell.numFmt = sourceCell.numFmt;
  }
}

export async function inspectPostingWorkbookTemplate(
  workbookBuffer: Buffer | Uint8Array | ArrayBuffer,
) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(toNodeBuffer(workbookBuffer) as unknown as WorkbookLoadInput);

  const sheets: PostingTemplateSheetPreview[] = workbook.worksheets.map((worksheet) => {
    const headerRow = detectHeaderRow(worksheet);
    const labelRow = headerRow + 1;
    const dataStartRow = headerRow + 2;

    return {
      name: worksheet.name,
      headerRow,
      labelRow,
      dataStartRow,
      columns: extractWorksheetColumns(worksheet, headerRow, dataStartRow),
    };
  });

  return {
    sheets,
    suggestedMappings:
      sheets[0]?.columns.map((column) => suggestFieldFromColumn(column)) || [],
  };
}

export async function createPostingTemplateWorkbook(
  rows: ReviewRow[],
  workbookBuffer: Buffer | Uint8Array | ArrayBuffer,
  config: PostingTemplateConfig,
) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(toNodeBuffer(workbookBuffer) as unknown as WorkbookLoadInput);

  const worksheet = workbook.getWorksheet(config.sheetName);
  if (!worksheet) {
    throw new Error(`Worksheet ${config.sheetName} was not found in the template workbook.`);
  }

  const templateStyleRowNumber = config.dataStartRow;
  const writeableRows = rows.filter((row) => !row.excludedFromExport);
  const maxExistingRows = Math.max(worksheet.rowCount, config.dataStartRow + writeableRows.length);
  const mappingsByColumnKey = new Map(config.mappings.map((mapping) => [mapping.columnKey, mapping]));
  const columns = extractWorksheetColumns(worksheet, config.headerRow, config.dataStartRow);

  for (let rowNumber = config.dataStartRow; rowNumber <= maxExistingRows; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
      row.getCell(columnIndex).value = null;
    }
    row.commit();
  }

  writeableRows.forEach((reviewRow, rowIndex) => {
    const rowNumber = config.dataStartRow + rowIndex;
    applyTemplateRowStyle(worksheet, templateStyleRowNumber, rowNumber);
    const targetRow = worksheet.getRow(rowNumber);

    columns.forEach((column) => {
      const mapping = mappingsByColumnKey.get(column.key);
      if (!mapping || mapping.sourceType === "ignore") {
        return;
      }

      const rawValue =
        mapping.sourceType === "constant"
          ? mapping.constantValue
          : mapping.sourceField
            ? getPostingFieldValue(reviewRow, mapping.sourceField)
            : undefined;

      targetRow.getCell(column.index).value = coerceExcelValue(
        rawValue as string | number | undefined,
      );
    });

    targetRow.commit();
  });

  return workbook.xlsx.writeBuffer();
}
