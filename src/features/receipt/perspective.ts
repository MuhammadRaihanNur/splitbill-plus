import type { CV } from "@techstark/opencv-js";

import { loadOpenCv } from "./opencv-loader";
import type { Point, ReceiptPolygon } from "./scan-types";

type PerspectiveSource = HTMLCanvasElement | HTMLImageElement | ImageBitmap;

function edgeLength(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException("Koreksi perspektif dibatalkan.", "AbortError");
  }
}

export function calculatePerspectiveSize(polygon: ReceiptPolygon): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(
      1,
      Math.ceil(
        Math.max(
          edgeLength(polygon.topLeft, polygon.topRight),
          edgeLength(polygon.bottomLeft, polygon.bottomRight),
        ),
      ),
    ),
    height: Math.max(
      1,
      Math.ceil(
        Math.max(
          edgeLength(polygon.topLeft, polygon.bottomLeft),
          edgeLength(polygon.topRight, polygon.bottomRight),
        ),
      ),
    ),
  };
}

export async function correctPerspective(
  source: PerspectiveSource,
  polygon: ReceiptPolygon,
  signal: AbortSignal,
  cvLoader: () => Promise<CV> = loadOpenCv,
): Promise<{ canvas: HTMLCanvasElement; cleanup: () => void }> {
  throwIfAborted(signal);
  const cv = await cvLoader();
  throwIfAborted(signal);
  const size = calculatePerspectiveSize(polygon);
  const input = cv.imread(source as HTMLCanvasElement);
  const output = new cv.Mat();
  const sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    polygon.topLeft.x,
    polygon.topLeft.y,
    polygon.topRight.x,
    polygon.topRight.y,
    polygon.bottomRight.x,
    polygon.bottomRight.y,
    polygon.bottomLeft.x,
    polygon.bottomLeft.y,
  ]);
  const destinationPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0,
    0,
    size.width,
    0,
    size.width,
    size.height,
    0,
    size.height,
  ]);
  const transform = cv.getPerspectiveTransform(sourcePoints, destinationPoints);
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    transform.delete();
    destinationPoints.delete();
    sourcePoints.delete();
    output.delete();
    input.delete();
  };

  try {
    throwIfAborted(signal);
    cv.warpPerspective(
      input,
      output,
      transform,
      new cv.Size(size.width, size.height),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(),
    );
    throwIfAborted(signal);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    cv.imshow(canvas, output);
    return { canvas, cleanup };
  } catch (error) {
    cleanup();
    throw error;
  }
}
