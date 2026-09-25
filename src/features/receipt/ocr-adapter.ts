import type { Worker } from "tesseract.js";

import type { OcrPass, ReceiptRecognizer } from "./ocr-orchestrator";
import type { OcrCandidate, OcrLine } from "./scan-types";
import type { OcrCallbacks } from "./types";

function abortError(): DOMException {
  return new DOMException("Pemindaian struk dibatalkan.", "AbortError");
}

function extractLines(data: Awaited<ReturnType<Worker["recognize"]>>["data"]): OcrLine[] {
  return (data.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.map((line) => ({
        text: line.text.trim(),
        confidence: Math.min(1, Math.max(0, line.confidence / 100)),
        bbox: line.bbox,
      })),
    ),
  );
}

export async function createReceiptRecognizer(
  callbacks: OcrCallbacks,
): Promise<ReceiptRecognizer> {
  if (callbacks.signal.aborted) throw abortError();
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["ind", "eng"], 1, {
    workerPath: "/ocr/runtime/worker.min.js",
    corePath: "/ocr/runtime/core",
    langPath: "/ocr/runtime/lang",
    logger: (message) => {
      if (message.status === "recognizing text") {
        callbacks.onProgress(message.progress);
      }
    },
  });

  return {
    async recognize(image, pass: OcrPass): Promise<OcrCandidate> {
      if (callbacks.signal.aborted) throw abortError();
      const startedAt = performance.now();
      const result = await worker.recognize(image);
      if (callbacks.signal.aborted) throw abortError();
      return {
        id: `${pass.orientation}-${pass.preprocessing}-${Math.round(startedAt)}`,
        rawText: result.data.text,
        lines: extractLines(result.data),
        engineConfidence: result.data.confidence,
        orientation: pass.orientation,
        preprocessing: pass.preprocessing,
        durationMs: performance.now() - startedAt,
      };
    },
    async terminate(): Promise<void> {
      await worker.terminate();
    },
  };
}

export async function recognizeReceipt(
  file: File,
  callbacks: OcrCallbacks,
): Promise<string> {
  const recognizer = await createReceiptRecognizer(callbacks);
  let rejectAbort: ((error: DOMException) => void) | undefined;
  const onAbort = () => rejectAbort?.(abortError());
  const abort = new Promise<never>((_, reject) => {
    rejectAbort = reject;
    callbacks.signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    const candidate = await Promise.race([
      recognizer.recognize(file, {
        orientation: 0,
        preprocessing: "original",
      }),
      abort,
    ]);
    return candidate.rawText;
  } finally {
    callbacks.signal.removeEventListener("abort", onAbort);
    await recognizer.terminate();
  }
}
