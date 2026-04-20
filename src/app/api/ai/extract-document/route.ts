import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api/auth-guard";
import {
  extractDocumentFromBuffer,
  extractDocumentFromTextWithAI,
} from "@/lib/uploads/extractor";

/** 20 MB — same cap as bank-statements upload */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;

    const formData = await request.formData();
    const file = formData.get("file");
    const rawExtractedText = formData.get("rawExtractedText");
    const fileName = formData.get("fileName");
    const mimeType = formData.get("mimeType");
    const confidence = formData.get("confidence");

    // Text-based extraction path (browser OCR result re-processed server-side)
    if (
      typeof rawExtractedText === "string" &&
      typeof fileName === "string" &&
      typeof mimeType === "string"
    ) {
      if (rawExtractedText.length > 50_000) {
        return NextResponse.json({ error: "Extracted text too large." }, { status: 400 });
      }
      const conf =
        typeof confidence === "string" && confidence.trim() ? Number(confidence) : 0.68;
      const extracted = await extractDocumentFromTextWithAI(
        fileName,
        mimeType,
        rawExtractedText,
        conf,
        "generic",
      );
      return NextResponse.json(extracted);
    }

    // File-based extraction path
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File exceeds the 20 MB limit." }, { status: 413 });
    }

    const buffer = await file.arrayBuffer();
    const extracted = await extractDocumentFromBuffer(
      file.name,
      file.type || "application/octet-stream",
      buffer,
      "generic",
    );

    return NextResponse.json(extracted);
  } catch (err) {
    console.error("[extract-document] error:", err);
    return NextResponse.json({ error: "Document extraction failed." }, { status: 500 });
  }
}
