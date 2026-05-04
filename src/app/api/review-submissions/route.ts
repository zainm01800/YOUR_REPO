import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api/auth-guard";
import { getPrismaClient } from "@/lib/data/prisma";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";

function isMissingTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  );
}

function serializeSubmission(submission: {
  id: string;
  status: string;
  period: string | null;
  note: string | null;
  readinessJson: unknown;
  submittedAt: Date;
  reviewedAt: Date | null;
  submittedBy: { name: string; email: string };
  reviewedBy?: { name: string; email: string } | null;
}) {
  return {
    id: submission.id,
    status: submission.status,
    period: submission.period,
    note: submission.note,
    readiness: submission.readinessJson,
    submittedAt: submission.submittedAt.toISOString(),
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    submittedByName: submission.submittedBy.name,
    submittedByEmail: submission.submittedBy.email,
    reviewedByName: submission.reviewedBy?.name ?? null,
    reviewedByEmail: submission.reviewedBy?.email ?? null,
  };
}

export async function GET() {
  const { repository, errorResponse } = await requireApiAuth();
  if (errorResponse) return errorResponse;

  const prisma = getPrismaClient();
  if (!prisma) {
    return NextResponse.json({ latest: null, submissions: [] });
  }

  const workspace = await repository.getWorkspace();
  let submissions: any[];
  try {
    submissions = await prisma.reviewSubmission.findMany({
      where: { workspaceId: workspace.id },
      include: {
        submittedBy: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 8,
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ latest: null, submissions: [], migrationPending: true });
    }
    throw error;
  }

  return NextResponse.json({
    latest: submissions[0] ? serializeSubmission(submissions[0]) : null,
    submissions: submissions.map(serializeSubmission),
  });
}

export async function POST(req: NextRequest) {
  const { repository, errorResponse } = await requireApiAuth();
  if (errorResponse) return errorResponse;

  const prisma = getPrismaClient();
  if (!prisma) {
    return NextResponse.json({ error: "Database not available." }, { status: 503 });
  }

  const [workspace, currentUser] = await Promise.all([
    repository.getWorkspace(),
    repository.getCurrentUser(),
  ]);

  let payload: {
    period?: string;
    note?: string;
    readiness?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  let submission: any;
  try {
    submission = await prisma.reviewSubmission.create({
      data: {
        workspaceId: workspace.id,
        submittedById: currentUser.id,
        period: payload.period?.trim() || null,
        note: payload.note?.trim() || null,
        readinessJson: payload.readiness ?? undefined,
      },
      include: {
        submittedBy: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: "Review submissions need the latest database migration before they can be saved." },
        { status: 503 },
      );
    }
    throw error;
  }

  return NextResponse.json({ submission: serializeSubmission(submission) });
}

export async function PATCH(req: NextRequest) {
  const { repository, errorResponse } = await requireApiAuth();
  if (errorResponse) return errorResponse;

  const prisma = getPrismaClient();
  if (!prisma) {
    return NextResponse.json({ error: "Database not available." }, { status: 503 });
  }

  const { viewerAccess } = await getServerViewerAccess();
  if (!viewerAccess.canReviewTax && !viewerAccess.canSeeFullAccounting) {
    return NextResponse.json({ error: "Only accountant/reviewer roles can mark records reviewed." }, { status: 403 });
  }

  const [workspace, currentUser] = await Promise.all([
    repository.getWorkspace(),
    repository.getCurrentUser(),
  ]);

  let payload: { id?: string; status?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const id = payload.id?.trim();
  const status = payload.status?.trim() || "reviewed";
  if (!id) {
    return NextResponse.json({ error: "Submission id required." }, { status: 400 });
  }
  if (!["in_review", "changes_requested", "reviewed"].includes(status)) {
    return NextResponse.json({ error: "Unsupported status." }, { status: 400 });
  }

  let existing: any;
  try {
    existing = await prisma.reviewSubmission.findFirst({
      where: { id, workspaceId: workspace.id },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: "Review submissions need the latest database migration before they can be reviewed." },
        { status: 503 },
      );
    }
    throw error;
  }
  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const submission = await prisma.reviewSubmission.update({
    where: { id },
    data: {
      status,
      reviewedAt: status === "reviewed" ? new Date() : null,
      reviewedById: status === "reviewed" ? currentUser.id : null,
    },
    include: {
      submittedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ submission: serializeSubmission(submission) });
}
