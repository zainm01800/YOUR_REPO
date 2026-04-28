import type { WorkspaceRole, WorkspaceAccessLevel } from "@/lib/domain/types";

const LEGACY_ROLE_MAP: Record<string, WorkspaceAccessLevel> = {
  owner: "owner",
  admin: "accountant_admin",
  accountant: "bookkeeper",
  viewer: "view_only",
  accountant_admin: "accountant_admin",
  bookkeeper: "bookkeeper",
  tax_reviewer: "tax_reviewer",
  view_only: "view_only",
};

export const WORKSPACE_ACCESS_LEVELS: WorkspaceAccessLevel[] = [
  "owner",
  "accountant_admin",
  "bookkeeper",
  "tax_reviewer",
  "view_only",
];

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceAccessLevel, string> = {
  owner: "Owner",
  accountant_admin: "Accountant Admin",
  bookkeeper: "Bookkeeper",
  tax_reviewer: "Tax Reviewer",
  view_only: "View Only",
};

export const WORKSPACE_ROLE_DESCRIPTIONS: Record<WorkspaceAccessLevel, string> = {
  owner: "Full control, billing, members, workspace deletion, and all accounting tools.",
  accountant_admin: "Can manage categories, mappings, reports, and period-control style accounting workflows.",
  bookkeeper: "Can categorise, reconcile, upload files, edit suppliers, and work the day-to-day bookkeeping flow.",
  tax_reviewer: "Can review tax and VAT outputs, export packs, and reporting summaries without editing operational data.",
  view_only: "Can inspect records and reports without making changes.",
};

export interface WorkspaceRolePermissions {
  canManageMembers: boolean;
  canDeleteWorkspace: boolean;
  canManageBusinessSettings: boolean;
  canManageAccountingSettings: boolean;
  canManageTemplates: boolean;
  canManageOperationalData: boolean;
  canReviewTax: boolean;
  canUseExportPack: boolean;
  canSeeFinancialReports: boolean;
  canSeeFullAccounting: boolean;
  canSeePostingBuilder: boolean;
}

export function normalizeWorkspaceRole(role?: string | null): WorkspaceAccessLevel {
  const normalized = role?.trim().toLowerCase() ?? "";
  return LEGACY_ROLE_MAP[normalized] ?? "view_only";
}

export function getWorkspaceRoleLabel(role?: string | null) {
  return WORKSPACE_ROLE_LABELS[normalizeWorkspaceRole(role)];
}

export function getWorkspaceRoleDescription(role?: string | null) {
  return WORKSPACE_ROLE_DESCRIPTIONS[normalizeWorkspaceRole(role)];
}

export function getWorkspaceRolePermissions(role?: string | null): WorkspaceRolePermissions {
  const normalized = normalizeWorkspaceRole(role);

  switch (normalized) {
    case "owner":
      return {
        canManageMembers: true,
        canDeleteWorkspace: true,
        canManageBusinessSettings: true,
        canManageAccountingSettings: true,
        canManageTemplates: true,
        canManageOperationalData: true,
        canReviewTax: true,
        canUseExportPack: true,
        canSeeFinancialReports: true,
        canSeeFullAccounting: true,
        canSeePostingBuilder: true,
      };
    case "accountant_admin":
      return {
        canManageMembers: false,
        canDeleteWorkspace: false,
        canManageBusinessSettings: false,
        canManageAccountingSettings: true,
        canManageTemplates: true,
        canManageOperationalData: true,
        canReviewTax: true,
        canUseExportPack: true,
        canSeeFinancialReports: true,
        canSeeFullAccounting: true,
        canSeePostingBuilder: true,
      };
    case "bookkeeper":
      return {
        canManageMembers: false,
        canDeleteWorkspace: false,
        canManageBusinessSettings: false,
        canManageAccountingSettings: false,
        canManageTemplates: false,
        canManageOperationalData: true,
        canReviewTax: false,
        canUseExportPack: false,
        canSeeFinancialReports: false,
        canSeeFullAccounting: false,
        canSeePostingBuilder: false,
      };
    case "tax_reviewer":
      return {
        canManageMembers: false,
        canDeleteWorkspace: false,
        canManageBusinessSettings: false,
        canManageAccountingSettings: false,
        canManageTemplates: false,
        canManageOperationalData: false,
        canReviewTax: true,
        canUseExportPack: true,
        canSeeFinancialReports: true,
        canSeeFullAccounting: false,
        canSeePostingBuilder: false,
      };
    case "view_only":
    default:
      return {
        canManageMembers: false,
        canDeleteWorkspace: false,
        canManageBusinessSettings: false,
        canManageAccountingSettings: false,
        canManageTemplates: false,
        canManageOperationalData: false,
        canReviewTax: false,
        canUseExportPack: false,
        canSeeFinancialReports: true,
        canSeeFullAccounting: false,
        canSeePostingBuilder: false,
      };
  }
}

export function toStoredWorkspaceRole(role?: string | null): WorkspaceRole {
  return normalizeWorkspaceRole(role);
}
