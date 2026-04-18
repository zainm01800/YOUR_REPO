import { put } from '@vercel/blob';

/**
 * Storage provider abstraction.
 * Currently uses Vercel Blob for production.
 * In environments where @vercel/blob is missing, it skips persistence
 * but returns a structured key for meta-data tracking.
 */
export async function uploadFile(
  path: string,
  buffer: Buffer | ArrayBuffer,
  mimeType: string
): Promise<string> {
  // Check if we are in a Vercel environment with the token available
  if (process.env.VERCEL_BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(path, buffer, {
        contentType: mimeType,
        access: 'public',
      });
      return blob.url;
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
  // If the key is already a URL (from Vercel Blob), return it
  if (storageKey.startsWith('http')) {
    return storageKey;
  }
  
  // Otherwise, we might need to handle local fallback or signing here
  return `/api/files/download?key=${encodeURIComponent(storageKey)}`;
}
