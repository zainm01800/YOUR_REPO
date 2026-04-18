import { NextRequest, NextResponse } from "next/server";
import {
  extractDocumentFromBuffer,
  extractDocumentFromTextWithAI,
} from "@/lib/uploads/extractor";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const rawExtractedText = formData.get("rawExtractedText");
  const fileName = formData.get("fileName");
  const mimeType = formData.get("mimeType");
  const confidence = formData.get("confidence");

  if (
    typeof rawExtractedText === "string" &&
    typeof fileName === "string" &&
    typeof mimeType === "string"
  ) {
    const conf = typeof confidence === "string" && confidence.trim() ? Number(confidence) : 0.68;
    const extracted = await extractDocumentFromTextWithAI(fileName, mimeType, rawExtractedText, conf, "generic");
    return NextResponse.json(extracted);
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const extracted = await extractDocumentFromBuffer(file.name, file.type || "application/octet-stream", buffer, "generic");

  return NextResponse.json(extracted);
}
