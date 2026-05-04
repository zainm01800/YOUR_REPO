import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api/auth-guard";
import { readStoredFile } from "@/lib/storage";

export async function GET(request: Request) {
  const { errorResponse } = await requireApiAuth();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const storageKey = searchParams.get("key")?.trim();

  if (!storageKey) {
    return NextResponse.json({ error: "Missing file key." }, { status: 400 });
  }

  if (storageKey.length > 2_000) {
    return NextResponse.json({ error: "Invalid file key." }, { status: 400 });
  }

  try {
    const file = await readStoredFile(storageKey);
    if (!file) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const headers = new Headers({
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });

    if (file.contentLength) {
      headers.set("Content-Length", file.contentLength);
    }

    return new NextResponse(file.body, { headers });
  } catch (err) {
    console.error("[Files] Download failed:", err);
    return NextResponse.json({ error: "File download failed." }, { status: 500 });
  }
}
