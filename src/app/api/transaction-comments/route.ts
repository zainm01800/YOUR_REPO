import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api/auth-guard";

// In-memory store for demo (in production this would be a DB table)
// We'll use a Map stored in module scope (resets on server restart - acceptable for now)
const commentsStore = new Map<string, Array<{
  id: string;
  transactionId: string;
  workspaceId: string;
  authorName: string;
  authorEmail: string;
  body: string;
  createdAt: string;
}>>();

export async function GET(req: NextRequest) {
  const { repository, errorResponse } = await requireApiAuth();
  if (errorResponse) return errorResponse;

  const txId = req.nextUrl.searchParams.get("transactionId");
  if (!txId) return NextResponse.json({ comments: [] });

  const workspace = await repository!.getWorkspace();
  const key = `${workspace.id}:${txId}`;
  const comments = commentsStore.get(key) ?? [];
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest) {
  const { repository, errorResponse } = await requireApiAuth();
  if (errorResponse) return errorResponse;

  const [workspace, currentUser] = await Promise.all([
    repository!.getWorkspace(),
    repository!.getCurrentUser(),
  ]);

  let body: { transactionId?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { transactionId, body: commentBody } = body;

  if (!transactionId || !commentBody?.trim()) {
    return NextResponse.json({ error: "transactionId and body required" }, { status: 400 });
  }

  const key = `${workspace.id}:${transactionId}`;
  const existing = commentsStore.get(key) ?? [];

  const comment = {
    id: `comment_${Date.now()}`,
    transactionId,
    workspaceId: workspace.id,
    authorName: currentUser.name ?? currentUser.email ?? "User",
    authorEmail: currentUser.email ?? "",
    body: commentBody.trim(),
    createdAt: new Date().toISOString(),
  };

  commentsStore.set(key, [...existing, comment]);
  return NextResponse.json({ comment });
}
