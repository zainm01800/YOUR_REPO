import ExcelJS from "exceljs";
import type { ReviewRow } from "@/lib/domain/types";

export async function createExcelExport(rows: ReviewRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Reconciled Export", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Source", key: "source", width: 24 },
    { header: "Supplier", key: "supplier", width: 24 },
    { header: "Date", key: "date", width: 16 },
    { header: "Currency", key: "currency", width: 12 },
    { header: "Net", key: "net", width: 12 },
    { header: "VAT", key: "vat", width: 12 },
    { header: "Gross", key: "gross", width: 12 },
    { header: "VAT %", key: "vatPercent", width: 12 },
    { header: "VAT Code", key: "vatCode", width: 14 },
    { header: "GL Code", key: "glCode", width: 12 },
    { header: "Match Status", key: "matchStatus", width: 18 },
    { header: "Original Description", key: "originalDescription", width: 36 },
    { header: "Employee", key: "employee", width: 20 },
    { header: "Notes", key: "notes", width: 42 },
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: "FF0E1A1F" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD4E4DA" },
  };

  rows
    .filter((row) => !row.excludedFromExport)
    .forEach((row) => {
      sheet.addRow({
        source: row.source,
        supplier: row.supplier,
        date: row.date,
        currency: row.currency,
        net: row.net,
        vat: row.vat,
        gross: row.gross,
        vatPercent: row.vatPercent,
        vatCode: row.vatCode,
        glCode: row.glCode,
        matchStatus: row.matchStatus,
        originalDescription: row.originalDescription,
        employee: row.employee,
        notes: row.notes,
      });
    });

  ["E", "F", "G"].forEach((columnKey) => {
    sheet.getColumn(columnKey).numFmt = "£#,##0.00";
  });

  return workbook.xlsx.writeBuffer();
}

