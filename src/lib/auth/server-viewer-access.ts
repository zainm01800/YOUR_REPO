import "server-only";

import { cache } from "react";
import { getRepository } from "@/lib/data";
import { buildViewerAccessProfile } from "@/lib/auth/viewer-access";
import { resolveViewerUser } from "@/lib/auth/viewer-user";

export const getServerViewerAccess = cache(async function getServerViewerAccess() {
  const repository = await getRepository();
  const [workspace, currentUser, userWorkspaces] = await Promise.all([
    repository.getWorkspace(),
    repository.getCurrentUser(),
    repository.getUserWorkspaces(),
  ]);

  const viewerUser = await resolveViewerUser(currentUser);
  const currentMembership = userWorkspaces.find((item) => item.id === workspace.id);
  const viewerAccess = buildViewerAccessProfile(
    viewerUser,
    workspace,
    currentMembership?.role,
  );

  return {
    repository,
    workspace,
    currentUser,
    viewerUser,
    userWorkspaces,
    currentMembership,
    viewerAccess,
  };
});
