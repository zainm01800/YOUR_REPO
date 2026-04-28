import { cache } from "react";
import { getRepository } from "@/lib/data";
import type { SettingsSnapshot } from "@/lib/domain/types";

// NOTE:
// These helpers intentionally avoid unstable_cache().
// The repository layer depends on the authenticated request context, and in
// Next 16 reading cookies/session data inside unstable_cache causes runtime
// failures on signed-in pages.
//
// We still use React's request-local cache() to de-duplicate repeated reads
// during a single render (for example when both the layout and page need the
// same viewer/workspace data). That gives us a speed-up without cross-user
// caching risk.

export const getCachedSettingsSnapshot = cache(async function getCachedSettingsSnapshot(_workspaceId: string) {
  const repository = await getRepository();
  return repository.getSettingsSnapshot();
});

export const getCachedRunSummaries = cache(async function getCachedRunSummaries(_workspaceId: string) {
  const repository = await getRepository();
  return repository.getRunSummaries();
});

export const getCachedBankStatementSummaries = cache(async function getCachedBankStatementSummaries(_workspaceId: string) {
  const repository = await getRepository();
  return repository.getBankStatementSummaries();
});

export const getCachedBookkeepingDataset = cache(async function getCachedBookkeepingDataset(_workspaceId: string) {
  const repository = await getRepository();
  const [workspace, categoryRules, vatRules, runs, unassignedBankTransactions] = await Promise.all([
    repository.getWorkspace(),
    repository.getCategoryRules(),
    repository.getVatRules(),
    repository.getBookkeepingRuns().catch((error) => {
      console.error("[cached-bookkeeping] failed to load runs with transactions:", error);
      return [];
    }),
    repository.getUnassignedBankTransactions().catch((error) => {
      console.error("[cached-bookkeeping] failed to load unassigned bank transactions:", error);
      return [];
    }),
  ]);

  const settingsSnapshot: SettingsSnapshot = {
    workspace,
    templates: [],
    vatRules,
    glRules: [],
    categoryRules,
    memberships: [],
    invitations: [],
  };

  return {
    settingsSnapshot,
    runs,
    unassignedBankTransactions,
  };
});

export const getCachedDashboardPageData = cache(async function getCachedDashboardPageData(_workspaceId: string) {
  const repository = await getRepository();
  const [snapshot, runsWithTransactions] = await Promise.all([
    repository.getDashboardSnapshot(),
    repository.getBookkeepingRuns(),
  ]);

  return {
    snapshot,
    runsWithTransactions,
  };
});
