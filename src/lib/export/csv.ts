import type { ExportColumnLayout, ReviewRow } from "@/lib/domain/types";
import { getExportCellValue, getVisibleExportLayout, normaliseExportLayout } from "@/lib/export/layout";

function escapeCell(value: string | number | undefined) {
  if (value === undefined || value === null) {
    return "";
  }

  const cell = String(value);
  return /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

export function createCsvExport(
  rows: ReviewRow[],
  layout?: ExportColumnLayout[],
) {
  const visibleLayout = getVisibleExportLayout(normaliseExportLayout(layout));
  const lines = [
    visibleLayout.map((column) => escapeCell(column.label)).join(","),
    ...rows
      .filter((row) => !row.excludedFromExport)
      .map((row) =>
        visibleLayout
          .map((column) => getExportCellValue(row, column.key))
          .map(escapeCell)
          .join(","),
      ),
  ];

  return lines.join("\n");
}
