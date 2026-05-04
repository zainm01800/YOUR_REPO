import { get, put } from "@vercel/blob";

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
}

/**
 * Storage provider abstraction.
 * Uses Vercel Blob for production.
 * In environments where @vercel/blob is missing, it skips persistence
 * but returns a structured key for meta-data tracking.
 */
export async function uploadFile(
  path: string,
  buffer: Buffer | ArrayBuffer,
  mimeType: string
): Promise<string> {
  // Check if we are in a Vercel environment with the token available
  const token = getBlobToken();
  if (token) {
    try {
      const access = process.env.BLOB_ACCESS === "public" ? "public" : "private";
      const blob = await put(path, buffer, {
        contentType: mimeType,
        access,
        token,
      });
      return blob.pathname || blob.url;
    } catch (err) {
      console.error('[Storage] Vercel Blob upload failed:', err);
      // Fallback to path-based key
    }
  } else {
    console.warn('[Storage] Vercel Blob token not found. Persistence skipped.');
  }

  // Fallback: return the path as the key (no actual persistence)
  // In a real production environment, you MUST have the token set.
  return path;
}

export function getFileUrl(storageKey: string): string {
  return `/api/files/download?key=${encodeURIComponent(storageKey)}`;
}

export async function readStoredFile(storageKey: string) {
  if (storageKey.startsWith("https://")) {
    const url = new URL(storageKey);
    if (!url.hostname.endsWith(".blob.vercel-storage.com")) {
      throw new Error("Unsupported storage URL.");
    }

    const response = await fetch(storageKey);
    if (!response.ok || !response.body) {
      return null;
    }

    return {
      body: response.body,
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      contentLength: response.headers.get("content-length"),
      fileName: decodeURIComponent(url.pathname.split("/").pop() || "download"),
    };
  }

  const token = getBlobToken();
  if (token) {
    const result = await get(storageKey, { access: "private", token });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }

    return {
      body: result.stream,
      contentType: result.blob.contentType ?? "application/octet-stream",
      contentLength: result.blob.size ? String(result.blob.size) : null,
      fileName: result.blob.pathname.split("/").pop() || "download",
    };
  }

  return null;
}
