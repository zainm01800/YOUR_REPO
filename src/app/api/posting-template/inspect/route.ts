import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api/auth-guard";
import { inspectPostingWorkbookTemplate } from "@/lib/export/posting-template";

/** ~10 MB base64 limit (raw bytes ≈ 7.5 MB) */
const MAX_BASE64_LENGTH = 10 * 1024 * 1024;

function decodeBase64Workbook(base64: string) {
  const cleaned = base64.includes(",") ? base64.split(",").at(-1) || "" : base64;
  return Buffer.from(cleaned, "base64");
}

export async function POST(request: Request) {
  try {
    const { errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;

    let body: { workbookBase64?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    if (!body.workbookBase64) {
      return NextResponse.json({ error: "Workbook file is required." }, { status: 400 });
    }

    if (body.workbookBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: "Workbook file exceeds the size limit." }, { status: 413 });
    }

    const preview = await inspectPostingWorkbookTemplate(
      decodeBase64Workbook(body.workbookBase64),
    );

    return NextResponse.json(preview);
  } catch (err) {
    console.error("[posting-template/inspect] error:", err);
    return NextResponse.json({ error: "Failed to inspect workbook." }, { status: 500 });
  }
}
