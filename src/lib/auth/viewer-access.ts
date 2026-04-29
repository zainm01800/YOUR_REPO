import type {
  BusinessType,
  User,
  UserAccountType,
  Workspace,
  WorkspaceRole,
} from "@/lib/domain/types";
import {
  getWorkspaceRolePermissions,
  normalizeWorkspaceRole,
} from "@/lib/auth/workspace-role";

export interface ViewerAccessProfile {
  accountType: UserAccountType;
  businessType: BusinessType;
  workspaceRole: WorkspaceRole;
  isWebsiteOwner: boolean;
  /** True when the user IS a real website owner, even when previewing another view mode. */
  isRealOwner: boolean;
  isAccountantView: boolean;
  canManageMembers: boolean;
  canDeleteWorkspace: boolean;
  canManageBusinessSettings: boolean;
  canManageAccountingSettings: boolean;
  canManageOperationalData: boolean;
  canReviewTax: boolean;
  canUseExportPack: boolean;
  canSeeFinancialReports: boolean;
  canSeeTemplates: boolean;
  canSeePostingBuilder: boolean;
  canSeeFullAccounting: boolean;
  canSeeSettings: boolean;
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function getWebsiteOwnerEmails() {
  const rawValues = [
    process.env.APP_OWNER_EMAILS,
    process.env.APP_OWNER_EMAIL,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[,\n;]/g));

  return Array.from(
    new Set(
      rawValues
        .map(normalizeEmail)
        .filter(Boolean),
    ),
  );
}

export function isWebsiteOwnerEmail(email?: string | null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getWebsiteOwnerEmails().includes(normalized);
}

export function buildViewerAccessProfile(
  user: Pick<User, "email" | "accountType">,
  workspace: Pick<Workspace, "businessType">,
  rawWorkspaceRole: WorkspaceRole = "view_only",
): ViewerAccessProfile {
  const isWebsiteOwner = isWebsiteOwnerEmail(user.email);
  const workspaceRole = normalizeWorkspaceRole(isWebsiteOwner ? "owner" : rawWorkspaceRole);
  const rolePermissions = getWorkspaceRolePermissions(workspaceRole);
  const isAccountantView =
    isWebsiteOwner ||
    user.accountType === "accountant" ||
    workspaceRole !== "owner";
  const canSeeFinancialReports =
    isWebsiteOwner ||
    rolePermissions.canSeeFinancialReports ||
    workspace.businessType === "general_small_business";

  return {
    accountType: isWebsiteOwner ? "accountant" : user.accountType,
    businessType: workspace.businessType,
    workspaceRole,
    isWebsiteOwner,
    isRealOwner: isWebsiteOwner,
    isAccountantView,
    canManageMembers: isWebsiteOwner || rolePermissions.canManageMembers,
    canDeleteWorkspace: isWebsiteOwner || rolePermissions.canDeleteWorkspace,
    canManageBusinessSettings: isWebsiteOwner || rolePermissions.canManageBusinessSettings,
    canManageAccountingSettings: isWebsiteOwner || rolePermissions.canManageAccountingSettings,
    canManageOperationalData: isWebsiteOwner || rolePermissions.canManageOperationalData,
    canReviewTax: isWebsiteOwner || rolePermissions.canReviewTax,
    canUseExportPack: isWebsiteOwner || rolePermissions.canUseExportPack,
    canSeeFinancialReports,
    canSeeTemplates: isWebsiteOwner || rolePermissions.canManageTemplates,
    canSeePostingBuilder: isWebsiteOwner || rolePermissions.canSeePostingBuilder,
    canSeeFullAccounting: isWebsiteOwner || rolePermissions.canSeeFullAccounting,
    canSeeSettings:
      isWebsiteOwner ||
      rolePermissions.canManageMembers ||
      rolePermissions.canManageBusinessSettings ||
      rolePermissions.canManageAccountingSettings,
  };
}
