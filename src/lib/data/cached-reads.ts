import { unstable_cache } from "next/cache";
import { getRepository } from "@/lib/data";
import { DATA_TAGS } from "@/lib/data/cache-tags";

const SHORT_REVALIDATE_SECONDS = 120;

export const getCachedSettingsSnapshot = unstable_cache(
  async () => (await getRepository()).getSettingsSnapshot(),
  ["settings-snapshot-v1"],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
    tags: [DATA_TAGS.settings],
  },
);

export const getCachedRunSummaries = unstable_cache(
  async () => (await getRepository()).getRunSummaries(),
  ["run-summaries-v1"],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
    tags: [DATA_TAGS.runs, DATA_TAGS.runSummaries],
  },
);

export const getCachedBankStatementSummaries = unstable_cache(
  async () => (await getRepository()).getBankStatementSummaries(),
  ["bank-statement-summaries-v1"],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
    tags: [DATA_TAGS.bankStatements],
  },
);

export const getCachedBookkeepingDataset = unstable_cache(
  async () => {
    const repository = await getRepository();
    const [settingsSnapshot, runs, unassignedBankTransactions] = await Promise.all([
      repository.getSettingsSnapshot(),
      repository.getRunsWithTransactions().catch((error) => {
        console.error("[cached-bookkeeping] failed to load runs with transactions:", error);
        return [];
      }),
      repository.getUnassignedBankTransactions().catch((error) => {
        console.error("[cached-bookkeeping] failed to load unassigned bank transactions:", error);
        return [];
      }),
    ]);

    return {
      settingsSnapshot,
      runs,
      unassignedBankTransactions,
    };
  },
  ["bookkeeping-dataset-v1"],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
    tags: [
      DATA_TAGS.settings,
      DATA_TAGS.runs,
      DATA_TAGS.bankStatements,
      DATA_TAGS.bookkeeping,
      DATA_TAGS.suppliers,
      DATA_TAGS.reports,
      DATA_TAGS.taxSummary,
    ],
  },
);

export const getCachedDashboardPageData = unstable_cache(
  async () => {
    const repository = await getRepository();
    const [snapshot, runsWithTransactions] = await Promise.all([
      repository.getDashboardSnapshot(),
      repository.getRunsWithTransactions(),
    ]);

    return {
      snapshot,
      runsWithTransactions,
    };
  },
  ["dashboard-page-data-v1"],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
    tags: [DATA_TAGS.dashboard, DATA_TAGS.runs, DATA_TAGS.settings, DATA_TAGS.bankStatements],
  },
);
