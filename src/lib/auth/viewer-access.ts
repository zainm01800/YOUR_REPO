import type { BusinessType, User, UserAccountType, Workspace } from "@/lib/domain/types";

export interface ViewerAccessProfile {
  accountType: UserAccountType;
  businessType: BusinessType;
  isWebsiteOwner: boolean;
  isAccountantView: boolean;
  canSeeFinancialReports: boolean;
  canSeeTemplates: boolean;
  canSeePostingBuilder: boolean;
  canSeeFullAccounting: boolean;
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function getWebsiteOwnerEmails() {
  return [process.env.APP_OWNER_EMAIL, process.env.AI_OWNER_EMAIL]
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isWebsiteOwnerEmail(email?: string | null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getWebsiteOwnerEmails().includes(normalized);
}

export function buildViewerAccessProfile(
  user: Pick<User, "email" | "accountType">,
  workspace: Pick<Workspace, "businessType">,
): ViewerAccessProfile {
  const isWebsiteOwner = isWebsiteOwnerEmail(user.email);
  const isAccountantView = isWebsiteOwner || user.accountType === "accountant";
  const canSeeFinancialReports =
    isAccountantView || workspace.businessType === "general_small_business";

  return {
    accountType: isWebsiteOwner ? "accountant" : user.accountType,
    businessType: workspace.businessType,
    isWebsiteOwner,
    isAccountantView,
    canSeeFinancialReports,
    canSeeTemplates: isAccountantView,
    canSeePostingBuilder: isAccountantView,
    canSeeFullAccounting: isAccountantView,
  };
}
