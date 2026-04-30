import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { isWebsiteOwnerEmail } from "@/lib/auth/viewer-access";
import type { ViewAsMode } from "@/app/actions/view-as-actions";

const VIEW_AS_COOKIE = "view_as_mode";

function isViewAsMode(value: unknown): value is ViewAsMode {
  return value === "owner" || value === "accountant" || value === "business_user";
}

function setModeResponse(mode: ViewAsMode, redirectTo?: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const response = redirectTo
    ? NextResponse.redirect(new URL(redirectTo, baseUrl))
    : NextResponse.json({ ok: true, mode });

  response.cookies.set(VIEW_AS_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}

export async function GET(request: Request) {
  const repository = await getRepository();
  const user = await repository.getCurrentUser();

  if (!isWebsiteOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  if (!isViewAsMode(mode)) {
    return NextResponse.json({ error: "Invalid view mode" }, { status: 400 });
  }

  const returnTo = url.searchParams.get("returnTo") || "/dashboard";
  return setModeResponse(mode, returnTo.startsWith("/") ? returnTo : "/dashboard");
}

export async function POST(request: Request) {
  const repository = await getRepository();
  const user = await repository.getCurrentUser();

  if (!isWebsiteOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (!isViewAsMode(body.mode)) {
    return NextResponse.json({ error: "Invalid view mode" }, { status: 400 });
  }

  return setModeResponse(body.mode);
}
