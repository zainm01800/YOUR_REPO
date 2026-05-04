import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api/auth-guard";
import { getPrismaClient } from "@/lib/data/prisma";

const REQUEST_TYPES = new Set([
  "missing_receipt",
  "personal_check",
  "vat_check",
  "category_check",
  "general",
]);

function isMissingTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  );
}

function serializeComment(comment: {
  id: string;
  transactionId: string;
  transactionSource: string;
  body: string;
  requestType: string | null;
  resolved: boolean;
  createdAt: Date;
  author: { name: string; email: string };
}) {
  return {
    id: comment.id,
    transactionId: comment.transactionId,
    transactionSource: comment.transactionSource,
    body: comment.body,
    requestType: comment.requestType,
    resolved: comment.resolved,
    createdAt: comment.createdAt.toISOString(),
    authorName: comment.author.name,
    authorEmail: comment.author.email,
  };
}

export async function GET(req: NextRequest) {
  const { repository, errorResponse } = await requireApiAuth();
  if (errorResponse) return errorResponse;

  const prisma = getPrismaClient();
  if (!prisma) {
    return NextResponse.json({ comments: [] });
  }

  const txId = req.nextUrl.searchParams.get("transactionId");
  if (!txId) return NextResponse.json({ comments: [] });

  const workspace = await repository.getWorkspace();
  let comments: any[];
  try {
    comments = await prisma.transactionComment.findMany({
      where: { workspaceId: workspace.id, transactionId: txId },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ comments: [], migrationPending: true });
    }
    throw error;
  }

  return NextResponse.json({ comments: comments.map(serializeComment) });
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
    transactionId?: string;
    body?: string;
    transactionSource?: string;
    requestType?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const transactionId = payload.transactionId?.trim();
  const commentBody = payload.body?.trim();
  const requestType = payload.requestType?.trim() || "general";

  if (!transactionId || !commentBody) {
    return NextResponse.json({ error: "transactionId and body required." }, { status: 400 });
  }
  if (!REQUEST_TYPES.has(requestType)) {
    return NextResponse.json({ error: "Unsupported request type." }, { status: 400 });
  }

  let comment: any;
  try {
    comment = await prisma.transactionComment.create({
      data: {
        workspaceId: workspace.id,
        transactionId,
        transactionSource: payload.transactionSource?.trim() || "transaction",
        requestType,
        body: commentBody,
        authorId: currentUser.id,
      },
      include: { author: { select: { name: true, email: true } } },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: "Transaction comments need the latest database migration before they can be saved." },
        { status: 503 },
      );
    }
    throw error;
  }

  return NextResponse.json({ comment: serializeComment(comment) });
}
