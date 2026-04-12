import type {
  ExportColumnLayout,
  ReviewGridColumnLayout,
  ReviewTableTemplate,
} from "@/lib/domain/types";

export const reviewTemplateStorageKey = "clearmatch.reviewTemplates";
export const defaultReviewTemplateId = "default";

export const defaultReviewColumns: ReviewGridColumnLayout[] = [
  { key: "date",         label: "Date",           visible: false, width: 14 },
  { key: "supplier",     label: "Supplier",       visible: true,  width: 24 },
  { key: "reference",    label: "Reference",      visible: false, width: 18 },
  { key: "description",  label: "Description",    visible: false, width: 32 },
  { key: "employee",     label: "Employee",       visible: false, width: 18 },
  { key: "source",       label: "Source",         visible: false, width: 20 },
  { key: "currency",     label: "Currency",       visible: false, width: 10 },
  { key: "originalValue",label: "Original Value", visible: true,  width: 14 },
  { key: "gross",        label: "Gross",          visible: true,  width: 12 },
  { key: "net",          label: "Net",            visible: true,  width: 12 },
  { key: "vat",          label: "VAT",            visible: true,  width: 12 },
  { key: "vatPercent",   label: "VAT %",          visible: true,  width: 10 },
  { key: "vatCode",      label: "VAT Code",       visible: true,  width: 12 },
  { key: "glCode",       label: "GL Code",        visible: true,  width: 12 },
  { key: "matchStatus",    label: "Match Status",    visible: false, width: 14 },
  { key: "confidence",     label: "Confidence",      visible: false, width: 12 },
  { key: "costCentre",     label: "Cost Centre",     visible: false, width: 16 },
  { key: "department",     label: "Department",      visible: false, width: 16 },
  { key: "invoiceNumber",  label: "Invoice No.",     visible: false, width: 16 },
  { key: "vatNumber",      label: "VAT Number",      visible: false, width: 16 },
  { key: "approvalStatus", label: "Approval Status", visible: false, width: 16 },
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
