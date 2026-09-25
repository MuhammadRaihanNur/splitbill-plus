import type { CV } from "@techstark/opencv-js";

export class OpenCvUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("OpenCV lokal tidak dapat dimuat.", { cause });
    this.name = "OpenCvUnavailableError";
  }
}

type InitializingCv = CV & { onRuntimeInitialized?: () => void };

let initialization: Promise<CV> | undefined;

async function initializeOpenCv(): Promise<CV> {
  try {
    const imported = await import("@techstark/opencv-js");
    const namespace = imported as unknown as {
      default?: InitializingCv | Promise<InitializingCv>;
    };
    const candidate = namespace.default ?? (imported as unknown as InitializingCv);
    const cv = await candidate;

    if (cv.Mat) return cv;
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error("OpenCV initialization timeout")),
        30_000,
      );
      cv.onRuntimeInitialized = () => {
        window.clearTimeout(timeout);
        resolve();
      };
    });
    return cv;
  } catch (error) {
    throw new OpenCvUnavailableError(error);
  }
}

export function loadOpenCv(): Promise<CV> {
  initialization ??= initializeOpenCv().catch((error) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}
