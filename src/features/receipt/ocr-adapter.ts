import type { OcrCallbacks } from "@/features/receipt/types";
export async function recognizeReceipt(
  file: File,
  callbacks: OcrCallbacks,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("ind+eng", 1, {
    logger: (message) => {
      if (message.status === "recognizing text")
        callbacks.onProgress(message.progress);
    },
  });
  const abort = () => void worker.terminate();
  callbacks.signal.addEventListener("abort", abort, { once: true });
  try {
    if (callbacks.signal.aborted)
      throw new DOMException("Dibatalkan", "AbortError");
    return (await worker.recognize(file)).data.text;
  } finally {
    callbacks.signal.removeEventListener("abort", abort);
    await worker.terminate();
  }
}
