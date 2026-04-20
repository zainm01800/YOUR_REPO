import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api/auth-guard";

const VALID_ACTION_TYPES = [
  "approve",
  "edit_field",
  "rematch",
  "override_vat_code",
  "override_gl_code",
  "no_receipt_required",
  "exclude_from_export",
] as const;

const ReviewMutationSchema = z.object({
  runId: z.string().min(1).max(128),
  rowId: z.string().min(1).max(128),
  actionType: z.enum(VALID_ACTION_TYPES),
  field: z.string().max(100).optional(),
  value: z.string().max(500).optional(),
  note: z.string().max(1000).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const parsed = ReviewMutationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const body = parsed.data;

    const run = await repository.getRun(body.runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    if (run.locked) {
      return NextResponse.json(
        { error: "This run is locked and cannot be edited." },
        { status: 409 },
      );
    }

    const mutation = await repository.saveReviewMutation(body);
    const [updatedRun, rows] = await Promise.all([
      repository.getRun(body.runId),
      repository.getRunRows(body.runId),
    ]);

    return NextResponse.json({ ok: true, mutation, run: updatedRun, rows });
  } catch (err) {
    console.error("[Review mutation] error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
