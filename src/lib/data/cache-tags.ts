import { revalidateTag } from "next/cache";

export const DATA_TAGS = {
  settings: "settings",
  runs: "runs",
  runSummaries: "run-summaries",
  dashboard: "dashboard",
  bookkeeping: "bookkeeping",
  bankStatements: "bank-statements",
  suppliers: "suppliers",
  reports: "reports",
  taxSummary: "tax-summary",
} as const;

const ALL_FINANCE_TAGS = [
  DATA_TAGS.settings,
  DATA_TAGS.runs,
  DATA_TAGS.runSummaries,
  DATA_TAGS.dashboard,
  DATA_TAGS.bookkeeping,
  DATA_TAGS.bankStatements,
  DATA_TAGS.suppliers,
  DATA_TAGS.reports,
  DATA_TAGS.taxSummary,
] as const;

export function revalidateFinanceData(tags: readonly string[] = ALL_FINANCE_TAGS) {
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
}

