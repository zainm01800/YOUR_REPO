import type {
  ExportColumnKey,
  ExportColumnLayout,
  ReviewRow,
} from "@/lib/domain/types";
import { formatPercent } from "@/lib/utils";

export const defaultExportLayout: ExportColumnLayout[] = [
  { key: "source", label: "Source", visible: true, width: 24 },
  { key: "supplier", label: "Supplier", visible: true, width: 24 },
  { key: "date", label: "Date", visible: true, width: 16 },
  { key: "currency", label: "Currency", visible: true, width: 12 },
  { key: "net", label: "Net", visible: true, width: 12 },
  { key: "vat", label: "VAT", visible: true, width: 12 },
  { key: "gross", label: "Gross", visible: true, width: 12 },
  { key: "vatPercent", label: "VAT %", visible: true, width: 12 },
  { key: "vatCode", label: "VAT Code", visible: true, width: 14 },
  { key: "glCode", label: "GL Code", visible: true, width: 12 },
  { key: "matchStatus", label: "Match Status", visible: true, width: 18 },
  {
    key: "originalDescription",
    label: "Original Description",
    visible: true,
    width: 36,
  },
  { key: "employee", label: "Employee", visible: true, width: 20 },
  { key: "notes", label: "Notes", visible: true, width: 42 },
];

export const exportLayoutPresets: Array<{
  id: string;
  label: string;
  layout: ExportColumnLayout[];
}> = [
  { id: "finance-default", label: "Finance default", layout: defaultExportLayout },
  {
    id: "compact-close-pack",
    label: "Compact close pack",
    layout: defaultExportLayout.map((column) =>
      column.key === "notes" || column.key === "originalDescription"
        ? { ...column, visible: false }
        : { ...column, width: Math.max(12, Math.round((column.width || 16) * 0.85)) },
    ),
  },
  {
    id: "tax-review",
    label: "Tax review first",
    layout: [
      { key: "supplier", label: "Supplier", visible: true, width: 24 },
      { key: "date", label: "Date", visible: true, width: 16 },
      { key: "currency", label: "Currency", visible: true, width: 12 },
      { key: "net", label: "Net", visible: true, width: 12 },
      { key: "vat", label: "VAT", visible: true, width: 12 },
      { key: "gross", label: "Gross", visible: true, width: 12 },
      { key: "vatPercent", label: "VAT %", visible: true, width: 12 },
      { key: "vatCode", label: "VAT Code", visible: true, width: 14 },
      { key: "glCode", label: "GL Code", visible: true, width: 12 },
      { key: "matchStatus", label: "Match Status", visible: true, width: 18 },
      { key: "source", label: "Source", visible: false, width: 24 },
      {
        key: "originalDescription",
        label: "Original Description",
        visible: true,
        width: 30,
      },
      { key: "employee", label: "Employee", visible: true, width: 20 },
      { key: "notes", label: "Notes", visible: false, width: 42 },
    ],
  },
];

export function getVisibleExportLayout(layout?: ExportColumnLayout[]) {
  return (layout || defaultExportLayout).filter((column) => column.visible);
}

export function getExportCellValue(row: ReviewRow, key: ExportColumnKey) {
  switch (key) {
    case "source":
      return row.source;
    case "supplier":
      return row.supplier;
    case "date":
      return row.date;
    case "currency":
      return row.currency;
    case "net":
      return row.net;
    case "vat":
      return row.vat;
    case "gross":
      return row.gross;
    case "vatPercent":
      return row.vatPercent;
    case "vatCode":
      return row.vatCode;
    case "glCode":
      return row.glCode;
    case "matchStatus":
      return row.matchStatus;
    case "originalDescription":
      return row.originalDescription;
    case "employee":
      return row.employee;
    case "notes":
      return row.notes;
  }
}

export function getPreviewCellValue(row: ReviewRow, key: ExportColumnKey) {
  const value = getExportCellValue(row, key);
  if (key === "vatPercent" && typeof value === "number") {
    return formatPercent(value);
  }
  return value ?? "";
}

export function normaliseExportLayout(
  layout?: ExportColumnLayout[] | null,
): ExportColumnLayout[] {
  if (!layout || layout.length === 0) {
    return defaultExportLayout.map((column) => ({ ...column }));
  }

  const byKey = new Map(layout.map((column) => [column.key, column]));

  return defaultExportLayout.map((baseColumn) => {
    const override = byKey.get(baseColumn.key);
    return override
      ? {
          ...baseColumn,
          ...override,
          label: override.label || baseColumn.label,
        }
      : { ...baseColumn };
  });
}

