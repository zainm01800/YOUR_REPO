import ExcelJS from "exceljs";
import type { ExportColumnLayout, ReviewRow } from "@/lib/domain/types";
import {
  getExportCellValue,
  getVisibleExportLayout,
  normaliseExportLayout,
} from "@/lib/export/layout";

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

export async function createExcelExport(
  rows: ReviewRow[],
  layout?: ExportColumnLayout[],
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Reconciled Export", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const visibleLayout = getVisibleExportLayout(normaliseExportLayout(layout));

  sheet.columns = visibleLayout.map((column) => ({
    header: column.label,
    key: column.key,
    width: column.width || 16,
  }));

  sheet.getRow(1).font = { bold: true, color: { argb: "FF0E1A1F" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD4E4DA" },
  };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: visibleLayout.length },
  };

  rows
    .filter((row) => !row.excludedFromExport)
    .forEach((row) => {
      const addedRow = sheet.addRow(
        Object.fromEntries(
          visibleLayout.map((column) => {
            const cellValue = getExportCellValue(row, column.key);

            if (column.key === "date" && typeof cellValue === "string") {
              const parsedDate = new Date(cellValue);
              return [
                column.key,
                Number.isNaN(parsedDate.getTime()) ? cellValue : parsedDate,
              ];
            }

            return [column.key, cellValue];
          }),
        ),
      );
      const rowNumber = addedRow.number;
      const netIndex = visibleLayout.findIndex((column) => column.key === "net");
      const vatIndex = visibleLayout.findIndex((column) => column.key === "vat");
      const grossIndex = visibleLayout.findIndex((column) => column.key === "gross");
      const vatPercentIndex = visibleLayout.findIndex(
        (column) => column.key === "vatPercent",
      );

      if (
        grossIndex >= 0 &&
        netIndex >= 0 &&
        vatIndex >= 0 &&
        (row.net !== undefined || row.vat !== undefined)
      ) {
        const netColumn = getExcelColumnName(netIndex + 1);
        const vatColumn = getExcelColumnName(vatIndex + 1);
        const grossCell = addedRow.getCell(grossIndex + 1);
        grossCell.value = {
          formula: `IF(COUNTA(${netColumn}${rowNumber}:${vatColumn}${rowNumber})=0,"",SUM(${netColumn}${rowNumber}:${vatColumn}${rowNumber}))`,
          result: row.gross ?? (row.net || 0) + (row.vat || 0),
        };
      }

      if (
        vatPercentIndex >= 0 &&
        netIndex >= 0 &&
        vatIndex >= 0 &&
        row.net &&
        row.vat !== undefined
      ) {
        const netColumn = getExcelColumnName(netIndex + 1);
        const vatColumn = getExcelColumnName(vatIndex + 1);
        const vatPercentCell = addedRow.getCell(vatPercentIndex + 1);
        vatPercentCell.value = {
          formula: `IF(OR(${netColumn}${rowNumber}="",${netColumn}${rowNumber}=0),"",${vatColumn}${rowNumber}/${netColumn}${rowNumber})`,
          result:
            row.vatPercent !== undefined ? row.vatPercent / 100 : row.vat / row.net,
        };
      }
    });

  visibleLayout.forEach((column, index) => {
    const excelColumn = sheet.getColumn(index + 1);
    if (column.key === "net" || column.key === "vat" || column.key === "gross") {
      excelColumn.numFmt = "#,##0.00";
    }
    if (column.key === "vatPercent") {
      excelColumn.numFmt = "0.0%";
    }
    if (column.key === "date") {
      excelColumn.numFmt = "dd/mm/yy";
    }
  });

  return workbook.xlsx.writeBuffer();
}
