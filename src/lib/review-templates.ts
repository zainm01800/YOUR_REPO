import type {
  ExportColumnLayout,
  ReviewGridColumnLayout,
  ReviewTableTemplate,
} from "@/lib/domain/types";

export const reviewTemplateStorageKey = "clearmatch.reviewTemplates";
export const defaultReviewTemplateId = "default";

export const defaultReviewColumns: ReviewGridColumnLayout[] = [
  { key: "supplier", label: "Supplier", visible: true, width: 24 },
  { key: "originalValue", label: "Original Value", visible: true, width: 14 },
  { key: "gross", label: "Gross", visible: true, width: 12 },
  { key: "net", label: "Net", visible: true, width: 12 },
  { key: "vat", label: "VAT", visible: true, width: 12 },
  { key: "vatPercent", label: "VAT %", visible: true, width: 10 },
  { key: "vatCode", label: "VAT Code", visible: true, width: 12 },
  { key: "glCode", label: "GL Code", visible: true, width: 12 },
];

export function cloneReviewColumns(columns: ReviewGridColumnLayout[]) {
  return columns.map((column) => ({ ...column }));
}

export function createDefaultReviewTemplate(): ReviewTableTemplate {
  return {
    id: defaultReviewTemplateId,
    name: "Default",
    columns: cloneReviewColumns(defaultReviewColumns),
    locked: true,
  };
}

export function normaliseReviewTemplates(
  templates?: ReviewTableTemplate[],
): ReviewTableTemplate[] {
  const defaultTemplate = createDefaultReviewTemplate();
  const nextTemplates = (templates || [])
    .filter((template) => template.id !== defaultReviewTemplateId)
    .map((template) => ({
      ...template,
      columns: cloneReviewColumns(template.columns),
    }));

  return [defaultTemplate, ...nextTemplates];
}

export function mapReviewTemplateToExportLayout(
  reviewTemplate: ReviewTableTemplate,
  exportLayout: ExportColumnLayout[],
) {
  const exportColumnsByKey = new Map(exportLayout.map((column) => [column.key, column]));
  const nextLayout: ExportColumnLayout[] = [];

  for (const reviewColumn of reviewTemplate.columns) {
    const exportColumn = exportColumnsByKey.get(reviewColumn.key as ExportColumnLayout["key"]);
    if (!exportColumn) {
      continue;
    }

    nextLayout.push({
      ...exportColumn,
      label: reviewColumn.label,
      visible: reviewColumn.visible,
      width: reviewColumn.width,
    });
    exportColumnsByKey.delete(exportColumn.key);
  }

  for (const column of exportLayout) {
    if (!exportColumnsByKey.has(column.key)) {
      continue;
    }

    nextLayout.push({ ...column });
  }

  return nextLayout;
}
