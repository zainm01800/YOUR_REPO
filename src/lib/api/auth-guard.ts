/**
 * Shared auth helpers for API route handlers.
 *
 * Usage:
 *   const { repository, user, errorResponse } = await requireApiAuth();
 *   if (errorResponse) return errorResponse;
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";

export interface ApiAuthResult {
  repository: Awaited<ReturnType<typeof getRepository>>;
  errorResponse: null;
}

export interface ApiAuthError {
  repository: null;
  errorResponse: NextResponse;
}

export type ApiAuthOutcome = ApiAuthResult | ApiAuthError;

/**
 * Ensures the request is from an authenticated, workspace-resolved user.
 * Returns `{ repository }` on success or `{ errorResponse }` on failure.
 * Callers must check `errorResponse` before proceeding.
 */
export async function requireApiAuth(): Promise<ApiAuthOutcome> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        repository: null,
        errorResponse: NextResponse.json({ error: "Unauthorised." }, { status: 401 }),
      };
    }

    const repository = await getRepository();
    return { repository, errorResponse: null };
  } catch (err) {
    console.error("[API auth] Failed to resolve repository:", err);
    return {
      repository: null,
      errorResponse: NextResponse.json(
        { error: "Authentication failed. Please sign in again." },
        { status: 401 },
      ),
    };
  }
}

/**
 * Wraps an API handler in a standard try/catch so uncaught errors
 * return a clean 500 JSON response rather than a Next.js HTML crash page.
 */
export function withErrorHandler(
  handler: (req: Request, ctx?: any) => Promise<NextResponse>,
) {
  return async (req: Request, ctx?: any): Promise<NextResponse> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error("[API] Unhandled error:", err);
      return NextResponse.json(
        { error: "An unexpected error occurred." },
        { status: 500 },
      );
    }
  };
}
