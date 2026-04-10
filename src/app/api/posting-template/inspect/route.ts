import { NextResponse } from "next/server";
import { inspectPostingWorkbookTemplate } from "@/lib/export/posting-template";

function decodeBase64Workbook(base64: string) {
  const cleaned = base64.includes(",") ? base64.split(",").at(-1) || "" : base64;
  return Buffer.from(cleaned, "base64");
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workbookBase64?: string;
  };

  if (!body.workbookBase64) {
    return NextResponse.json({ error: "Workbook file is required." }, { status: 400 });
  }

  const preview = await inspectPostingWorkbookTemplate(
    decodeBase64Workbook(body.workbookBase64),
  );

  return NextResponse.json(preview);
}
