import { createWorker } from "tesseract.js";

self.onmessage = async (event: MessageEvent) => {
  const { files } = event.data;
  const worker = await createWorker("eng");

  try {
    const extracted = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      self.postMessage({ 
        type: "progress", 
        message: `OCR Processing: ${file.fileName} (${index + 1}/${files.length})...`,
        progress: (index / files.length) * 100
      });
      
      const result = await worker.recognize(file.blob);
      extracted.push({
        fileName: file.fileName,
        mimeType: file.mimeType,
        rawExtractedText: result.data.text || "",
        source: "browser_worker_tesseract",
        confidence: typeof result.data.confidence === "number" ? result.data.confidence / 100 : 0.68,
      });
    }
    self.postMessage({ type: "success", extracted });
  } catch (error) {
    self.postMessage({ type: "error", error: String(error) });
  } finally {
    await worker.terminate();
  }
};
