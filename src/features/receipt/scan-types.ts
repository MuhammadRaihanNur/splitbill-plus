import type { ParsedReceiptItem } from "./types";

export type RightAngle = 0 | 90 | 180 | 270;
export type PolygonSource = "automatic" | "manual" | "full-image";
export type PreprocessingMode =
  | "original"
  | "grayscale"
  | "contrast"
  | "adaptive-threshold"
  | "otsu"
  | "sharpen";
export type ScanStage =
  | "loading-image"
  | "detecting-receipt"
  | "correcting-perspective"
  | "preparing-variant"
  | "recognizing-text"
  | "interpreting-layout"
  | "reconciling-totals";

export interface Point {
  x: number;
  y: number;
}

export interface ReceiptPolygon {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
  confidence: number;
  source: PolygonSource;
}

export interface OcrLine {
  text: string;
  confidence: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrCandidate {
  id: string;
  rawText: string;
  lines: OcrLine[];
  engineConfidence: number;
  orientation: RightAngle;
  preprocessing: PreprocessingMode;
  durationMs: number;
}

export interface ReceiptIssue {
  code:
    "low-confidence" | "total-mismatch" | "ambiguous-gap" | "missing-subtotal";
  message: string;
}

export interface InterpretedReceipt {
  items: ParsedReceiptItem[];
  unresolvedItems?: string[];
  subtotal?: number;
  tax?: number;
  serviceCharge?: number;
  discount?: number;
  grandTotal?: number;
  confidence: number;
  issues: ReceiptIssue[];
  sourceCandidateId: string;
}

export interface ScanProgress {
  stage: ScanStage;
  progress: number;
  pass: number;
  totalPasses: number;
  elapsedMs: number;
}

export function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function createFullImagePolygon(
  width: number,
  height: number,
): ReceiptPolygon {
  return {
    topLeft: { x: 0, y: 0 },
    topRight: { x: width, y: 0 },
    bottomRight: { x: width, y: height },
    bottomLeft: { x: 0, y: height },
    confidence: 0,
    source: "full-image",
  };
}
