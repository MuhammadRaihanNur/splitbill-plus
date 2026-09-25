import { scoreCandidate, shouldStopScanning } from "./candidate-scorer";
import { renderVariant, variantPlan } from "./image-variants";
import { createReceiptRecognizer } from "./ocr-adapter";
import type {
  InterpretedReceipt,
  OcrCandidate,
  PreprocessingMode,
  RightAngle,
  ScanProgress,
} from "./scan-types";

type SourceImage = CanvasImageSource & { width: number; height: number };
type RecognizerImage = HTMLCanvasElement | File | Blob;

export interface OcrPass {
  orientation: RightAngle;
  preprocessing: PreprocessingMode;
}

export interface ReceiptRecognizer {
  recognize(image: RecognizerImage, pass: OcrPass): Promise<OcrCandidate>;
  terminate(): Promise<void>;
}

export interface AdaptiveOcrInput {
  source: SourceImage;
  preferredOrientation?: RightAngle;
  lowMemory: boolean;
  interpret(candidate: OcrCandidate): InterpretedReceipt;
}

export interface AdaptiveOcrCallbacks {
  signal: AbortSignal;
  onProgress?: (progress: ScanProgress) => void;
  createRecognizer?: () => Promise<ReceiptRecognizer>;
  render?: (
    source: SourceImage,
    pass: OcrPass,
    signal: AbortSignal,
  ) => Promise<HTMLCanvasElement | ImageBitmap>;
}

export interface ScoredOcrCandidate {
  candidate: OcrCandidate;
  interpreted: InterpretedReceipt;
  score: number;
}

export interface AdaptiveOcrResult {
  best: OcrCandidate;
  interpreted: InterpretedReceipt;
  alternatives: ScoredOcrCandidate[];
}

function abortError(): DOMException {
  return new DOMException("Pemindaian struk dibatalkan.", "AbortError");
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

export function orientationOrder(preferred?: RightAngle): RightAngle[] {
  const orientations: RightAngle[] = [0, 90, 180, 270];
  return preferred === undefined
    ? orientations
    : [preferred, ...orientations.filter((angle) => angle !== preferred)];
}

function passPlan(input: AdaptiveOcrInput): OcrPass[] {
  const orientations = orientationOrder(input.preferredOrientation);
  const preprocessing = variantPlan({
    lowMemory: input.lowMemory,
    needsMorePasses: true,
  });
  return preprocessing.flatMap((mode) =>
    orientations.map((orientation) => ({ orientation, preprocessing: mode })),
  );
}

function recognizeWithAbort(
  recognizer: ReceiptRecognizer,
  image: RecognizerImage,
  pass: OcrPass,
  signal: AbortSignal,
): Promise<OcrCandidate> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(abortError());
    signal.addEventListener("abort", abort, { once: true });
    recognizer
      .recognize(image, pass)
      .then(resolve, reject)
      .finally(() => {
        signal.removeEventListener("abort", abort);
      });
  });
}

function asCanvas(rendered: HTMLCanvasElement | ImageBitmap): {
  image: HTMLCanvasElement;
  cleanup: () => void;
} {
  if (rendered instanceof HTMLCanvasElement) {
    return { image: rendered, cleanup: () => undefined };
  }
  const canvas = document.createElement("canvas");
  canvas.width = rendered.width;
  canvas.height = rendered.height;
  const context = canvas.getContext("2d");
  if (!context) {
    rendered.close();
    throw new Error("Canvas 2D tidak tersedia pada browser ini.");
  }
  context.drawImage(rendered, 0, 0);
  return { image: canvas, cleanup: () => rendered.close() };
}

function retainBest(
  retained: ScoredOcrCandidate[],
  next: ScoredOcrCandidate,
): ScoredOcrCandidate[] {
  const fingerprint = next.candidate.rawText
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const unique = retained.filter(
    (entry) =>
      entry.candidate.rawText.toLowerCase().replace(/\s+/g, " ").trim() !==
      fingerprint,
  );
  return [...unique, next].sort((a, b) => b.score - a.score).slice(0, 3);
}

export async function runAdaptiveOcr(
  input: AdaptiveOcrInput,
  callbacks: AdaptiveOcrCallbacks,
): Promise<AdaptiveOcrResult> {
  const startedAt = performance.now();
  const passes = passPlan(input);
  throwIfAborted(callbacks.signal);
  const recognizer = await (callbacks.createRecognizer?.() ??
    createReceiptRecognizer({
      signal: callbacks.signal,
      onProgress: () => undefined,
    }));
  let retained: ScoredOcrCandidate[] = [];

  try {
    for (let index = 0; index < passes.length; index += 1) {
      throwIfAborted(callbacks.signal);
      const pass = passes[index];
      callbacks.onProgress?.({
        stage: "preparing-variant",
        progress: index / passes.length,
        pass: index + 1,
        totalPasses: passes.length,
        elapsedMs: performance.now() - startedAt,
      });
      const rendered = await (callbacks.render?.(
        input.source,
        pass,
        callbacks.signal,
      ) ?? renderVariant(input.source, pass, callbacks.signal));
      const normalized = asCanvas(rendered);
      try {
        callbacks.onProgress?.({
          stage: "recognizing-text",
          progress: index / passes.length,
          pass: index + 1,
          totalPasses: passes.length,
          elapsedMs: performance.now() - startedAt,
        });
        const candidate = await recognizeWithAbort(
          recognizer,
          normalized.image,
          pass,
          callbacks.signal,
        );
        const interpreted = input.interpret(candidate);
        const score = scoreCandidate(candidate, interpreted);
        const scored = { candidate, interpreted, score };
        retained = retainBest(retained, scored);
        if (shouldStopScanning(score, interpreted)) break;
      } finally {
        normalized.cleanup();
      }
    }
  } finally {
    await recognizer.terminate();
  }

  const best = retained[0];
  if (!best) throw new Error("OCR tidak menghasilkan kandidat teks.");
  return {
    best: best.candidate,
    interpreted: best.interpreted,
    alternatives: retained,
  };
}
