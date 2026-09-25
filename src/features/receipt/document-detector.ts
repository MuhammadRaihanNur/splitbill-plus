import type { CV, Mat } from "@techstark/opencv-js";

import { loadOpenCv } from "./opencv-loader";
import type { Point, ReceiptPolygon } from "./scan-types";

type CvLoader = () => Promise<CV>;
type DetectorSource = HTMLCanvasElement | HTMLImageElement | ImageBitmap;

function abortError(): DOMException {
  return new DOMException("Deteksi struk dibatalkan.", "AbortError");
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

function polygonArea(points: Point[]): number {
  return Math.abs(
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2,
  );
}

function distance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function orderPolygon(
  points: Point[],
): Omit<ReceiptPolygon, "confidence" | "source"> {
  if (points.length !== 4) throw new Error("Poligon struk harus memiliki 4 titik.");
  const byVerticalPosition = [...points].sort((first, second) =>
    first.y === second.y ? first.x - second.x : first.y - second.y,
  );
  const top = byVerticalPosition.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = byVerticalPosition.slice(2).sort((a, b) => a.x - b.x);
  return {
    topLeft: top[0],
    topRight: top[1],
    bottomRight: bottom[1],
    bottomLeft: bottom[0],
  };
}

export function scoreReceiptPolygon(
  points: Point[],
  imageSize: { width: number; height: number },
): number {
  if (points.length !== 4 || imageSize.width <= 0 || imageSize.height <= 0) return 0;
  const ordered = orderPolygon(points);
  const corners = [
    ordered.topLeft,
    ordered.topRight,
    ordered.bottomRight,
    ordered.bottomLeft,
  ];
  const coverage = polygonArea(corners) / (imageSize.width * imageSize.height);
  const coverageScore = Math.min(1, coverage / 0.65);
  const width = Math.max(
    distance(ordered.topLeft, ordered.topRight),
    distance(ordered.bottomLeft, ordered.bottomRight),
  );
  const height = Math.max(
    distance(ordered.topLeft, ordered.bottomLeft),
    distance(ordered.topRight, ordered.bottomRight),
  );
  const receiptShapeScore = Math.min(1, height / Math.max(1, width));
  const centerX = corners.reduce((sum, point) => sum + point.x, 0) / 4;
  const centerY = corners.reduce((sum, point) => sum + point.y, 0) / 4;
  const offset = Math.hypot(
    (centerX - imageSize.width / 2) / imageSize.width,
    (centerY - imageSize.height / 2) / imageSize.height,
  );
  const centerScore = Math.max(0, 1 - offset * 2);
  return Math.min(1, coverageScore * 0.6 + receiptShapeScore * 0.25 + centerScore * 0.15);
}

function pointsFromApproximation(approximation: Mat): Point[] {
  const values = approximation.data32S;
  const points: Point[] = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    points.push({ x: values[index], y: values[index + 1] });
  }
  return points;
}

export async function detectReceiptPolygon(
  source: DetectorSource,
  signal: AbortSignal,
  cvLoader: CvLoader = loadOpenCv,
): Promise<ReceiptPolygon | undefined> {
  throwIfAborted(signal);
  let cv: CV;
  try {
    cv = await cvLoader();
  } catch {
    return undefined;
  }
  throwIfAborted(signal);

  const resources: Array<{ delete(): void }> = [];
  try {
    const input = cv.imread(source as HTMLCanvasElement);
    resources.push(input);
    const grayscale = new cv.Mat();
    resources.push(grayscale);
    const blurred = new cv.Mat();
    resources.push(blurred);
    const edges = new cv.Mat();
    resources.push(edges);
    const contours = new cv.MatVector();
    resources.push(contours);
    const hierarchy = new cv.Mat();
    resources.push(hierarchy);

    cv.cvtColor(input, grayscale, cv.COLOR_RGBA2GRAY);
    throwIfAborted(signal);
    cv.GaussianBlur(
      grayscale,
      blurred,
      new cv.Size(5, 5),
      0,
      0,
      cv.BORDER_DEFAULT,
    );
    cv.Canny(blurred, edges, 60, 180);
    throwIfAborted(signal);
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE,
    );
    throwIfAborted(signal);

    let best:
      | { points: Point[]; confidence: number }
      | undefined;
    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const approximation = new cv.Mat();
      try {
        const perimeter = cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approximation, perimeter * 0.02, true);
        if (approximation.rows !== 4 || !cv.isContourConvex(approximation)) continue;
        const points = pointsFromApproximation(approximation);
        const confidence = scoreReceiptPolygon(points, {
          width: input.cols,
          height: input.rows,
        });
        if (!best || confidence > best.confidence) best = { points, confidence };
      } finally {
        approximation.delete();
        contour.delete();
      }
      throwIfAborted(signal);
    }

    if (!best || best.confidence < 0.6) return undefined;
    return {
      ...orderPolygon(best.points),
      confidence: best.confidence,
      source: "automatic",
    };
  } finally {
    for (let index = resources.length - 1; index >= 0; index -= 1) {
      resources[index].delete();
    }
  }
}
