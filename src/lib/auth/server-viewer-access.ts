import "server-only";

import { cache } from "react";
import { getRepository } from "@/lib/data";
import { buildViewerAccessProfile, isWebsiteOwnerEmail } from "@/lib/auth/viewer-access";
import { resolveViewerUser } from "@/lib/auth/viewer-user";
import { getViewAsMode, type ViewAsMode } from "@/app/actions/view-as-actions";

export const getServerViewerAccess = cache(async function getServerViewerAccess() {
  const repository = await getRepository();
  const [workspace, currentUser, userWorkspaces] = await Promise.all([
    repository.getWorkspace(),
    repository.getCurrentUser(),
    repository.getUserWorkspaces(),
  ]);

  const isOwner = isWebsiteOwnerEmail(currentUser.email);
  const viewAsMode: ViewAsMode = isOwner ? await getViewAsMode() : "owner";

  const viewerUser = await resolveViewerUser(currentUser);
  const currentMembership = userWorkspaces.find((item) => item.id === workspace.id);

  let viewerAccess = buildViewerAccessProfile(
    viewerUser,
    workspace,
    currentMembership?.role,
  );

  // Website owners can preview other views without losing their real identity.
  // We use a fake non-owner email so isWebsiteOwner is correctly false inside
  // buildViewerAccessProfile, and all permission flags derive purely from the
  // simulated accountType and role — matching what a real user would see.
  if (isOwner && viewAsMode !== "owner") {
    const simulatedUser = {
      email: "simulated-preview@internal.invalid", // not an owner email
      accountType: viewAsMode === "accountant" ? "accountant" : "business_user",
    } as typeof viewerUser;

    // Accountant: use accountant_admin role (full accounting, no member mgmt)
    // Business user: use owner role so isAccountantView stays false and the
    //   simplified business nav is shown (isAccountantView = not owner email,
    //   not accountant type, workspaceRole === "owner" → false).
    const simulatedRole = viewAsMode === "accountant" ? "accountant_admin" : "owner";

    const simulatedProfile = buildViewerAccessProfile(simulatedUser, workspace, simulatedRole);

    viewerAccess = {
      ...simulatedProfile,
      isRealOwner: true,
      // Accountants are hired professionals, not workspace admins — they should
      // not see member management or business settings.
      ...(viewAsMode === "accountant" ? { canSeeSettings: false } : {}),
    };
  }

  return {
    repository,
    workspace,
    currentUser,
    viewerUser,
    userWorkspaces,
    currentMembership,
    viewerAccess,
    viewAsMode,
  };
});
