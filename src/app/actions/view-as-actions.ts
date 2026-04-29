"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isWebsiteOwnerEmail } from "@/lib/auth/viewer-access";
import { getRepository } from "@/lib/data";

export type ViewAsMode = "owner" | "accountant" | "business_user";

const VIEW_AS_COOKIE = "view_as_mode";

export async function setViewAsModeAction(mode: ViewAsMode) {
  // Guard: only website owners can use this
  const repository = await getRepository();
  const user = await repository.getCurrentUser();
  if (!isWebsiteOwnerEmail(user.email)) {
    throw new Error("Permission denied");
  }

  const cookieStore = await cookies();
  cookieStore.set(VIEW_AS_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    sameSite: "lax",
  });

  // Revalidate all app pages so the nav re-renders immediately
  revalidatePath("/(app)", "layout");
}

export async function getViewAsMode(): Promise<ViewAsMode> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(VIEW_AS_COOKIE)?.value;
  if (raw === "accountant" || raw === "business_user") return raw;
  return "owner";
}
