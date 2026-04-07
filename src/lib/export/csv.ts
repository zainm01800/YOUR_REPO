import type { ReviewRow } from "@/lib/domain/types";

const exportHeaders = [
  "Source",
  "Supplier",
  "Date",
  "Currency",
  "Net",
  "VAT",
  "Gross",
  "VAT %",
  "VAT Code",
  "GL Code",
  "Match Status",
  "Original Description",
  "Employee",
  "Notes",
];

function escapeCell(value: string | number | undefined) {
  if (value === undefined || value === null) {
    return "";
  }

  const cell = String(value);
  return /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

export function createCsvExport(rows: ReviewRow[]) {
  const lines = [
    exportHeaders.join(","),
    ...rows
      .filter((row) => !row.excludedFromExport)
      .map((row) =>
        [
          row.source,
          row.supplier,
          row.date,
          row.currency,
          row.net,
          row.vat,
          row.gross,
          row.vatPercent,
          row.vatCode,
          row.glCode,
          row.matchStatus,
          row.originalDescription,
          row.employee,
          row.notes,
        ]
          .map(escapeCell)
          .join(","),
      ),
  ];

  return lines.join("\n");
}

