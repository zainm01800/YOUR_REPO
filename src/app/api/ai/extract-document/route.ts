import { NextRequest, NextResponse } from "next/server";
import { extractDocumentFromBuffer } from "@/lib/uploads/extractor";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const extracted = await extractDocumentFromBuffer(file.name, file.type || "application/octet-stream", buffer);

  return NextResponse.json(extracted);
}
