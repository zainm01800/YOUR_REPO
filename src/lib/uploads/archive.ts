import JSZip from "jszip";

const supportedFileTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function expandArchive(fileName: string, buffer: ArrayBuffer) {
  if (!fileName.toLowerCase().endsWith(".zip")) {
    return [];
  }

  const zip = await JSZip.loadAsync(buffer);
  const entries = await Promise.all(
    Object.values(zip.files)
      .filter((file) => !file.dir)
      .map(async (file) => {
        const content = await file.async("arraybuffer");
        return {
          fileName: file.name,
          mimeType: file.name.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : file.name.toLowerCase().endsWith(".png")
              ? "image/png"
              : file.name.toLowerCase().endsWith(".webp")
                ? "image/webp"
                : "image/jpeg",
          buffer: content,
        };
      }),
  );

  return entries.filter((entry) => supportedFileTypes.includes(entry.mimeType));
}
