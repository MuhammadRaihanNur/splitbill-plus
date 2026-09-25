import { describe, expect, it } from "vitest";

import type { InterpretedReceipt, OcrCandidate } from "./scan-types";
import { scoreCandidate, shouldStopScanning } from "./candidate-scorer";

function candidate(id: string, confidence: number): OcrCandidate {
  return {
    id,
    rawText: id,
    lines: [],
    engineConfidence: confidence,
    orientation: 0,
    preprocessing: "grayscale",
    durationMs: 100,
  };
}

function interpreted(
  prices: number[],
  subtotal: number,
  confidence: number,
): InterpretedReceipt {
  return {
    items: prices.map((unitPrice, index) => ({
      name: `Item ${index + 1}`,
      quantity: 1,
      unitPrice,
      confidence,
      source: "ocr",
    })),
    subtotal,
    confidence,
    issues:
      prices.reduce((sum, price) => sum + price, 0) === subtotal
        ? []
        : [{ code: "total-mismatch", message: "Jumlah item berbeda." }],
    sourceCandidateId: "candidate",
  };
}

describe("OCR candidate scoring", () => {
  it("ranks eight coherent items matching Rp214.000 above a Rp17.000 gap", () => {
    const exact = interpreted(
      [25_000, 30_000, 18_000, 22_000, 35_000, 28_000, 26_000, 30_000],
      214_000,
      0.93,
    );
    const mismatch = interpreted(
      [25_000, 30_000, 18_000, 22_000, 35_000, 28_000, 39_000],
      214_000,
      0.78,
    );

    expect(scoreCandidate(candidate("exact", 94), exact)).toBeGreaterThan(
      scoreCandidate(candidate("mismatch", 82), mismatch),
    );
    expect(
      shouldStopScanning(scoreCandidate(candidate("exact", 94), exact), exact),
    ).toBe(true);
    expect(
      shouldStopScanning(
        scoreCandidate(candidate("mismatch", 82), mismatch),
        mismatch,
      ),
    ).toBe(false);
  });
});
