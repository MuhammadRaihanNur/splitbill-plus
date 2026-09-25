import { describe, expect, it } from "vitest";

import type { OcrCandidate, OcrLine } from "./scan-types";
import { interpretReceipt } from "./receipt-interpreter";

function candidate(rawText: string, lines: OcrLine[] = []): OcrCandidate {
  return {
    id: "fixture",
    rawText,
    lines,
    engineConfidence: 92,
    orientation: 0,
    preprocessing: "grayscale",
    durationMs: 20,
  };
}

describe("interpretReceipt", () => {
  it("reads minimarket item, quantity, unit, and total columns", () => {
    const receipt = interpretReceipt(
      candidate("", [
        { text: "25.000", confidence: 0.9, bbox: { x0: 550, y0: 100, x1: 650, y1: 130 } },
        { text: "ROTI TAWAR", confidence: 0.94, bbox: { x0: 50, y0: 100, x1: 250, y1: 130 } },
        { text: "2", confidence: 0.92, bbox: { x0: 400, y0: 100, x1: 420, y1: 130 } },
        { text: "50.000", confidence: 0.91, bbox: { x0: 760, y0: 100, x1: 870, y1: 130 } },
        { text: "SUBTOTAL", confidence: 0.95, bbox: { x0: 500, y0: 200, x1: 650, y1: 230 } },
        { text: "50.000", confidence: 0.95, bbox: { x0: 760, y0: 200, x1: 870, y1: 230 } },
      ]),
    );

    expect(receipt.items).toEqual([
      {
        name: "ROTI TAWAR",
        quantity: 2,
        unitPrice: 25_000,
        confidence: 0.9,
        source: "ocr",
      },
    ]);
    expect(receipt.subtotal).toBe(50_000);
  });

  it("reads restaurant multiline and café unit × quantity layouts", () => {
    const receipt = interpretReceipt(
      candidate(`Pain Au Choco
DOUBLE CHOCO
17.000 x3 51.000
Salt Bread
18.000 ×2 36.000
Subtotal 87.000`),
    );

    expect(receipt.items).toEqual([
      {
        name: "Pain Au Choco DOUBLE CHOCO",
        quantity: 3,
        unitPrice: 17_000,
        confidence: 0.92,
        source: "ocr",
      },
      {
        name: "Salt Bread",
        quantity: 2,
        unitPrice: 18_000,
        confidence: 0.92,
        source: "ocr",
      },
    ]);
  });

  it("sorts rotated word order and excludes discounts from items", () => {
    const receipt = interpretReceipt(
      candidate("", [
        { text: "20.000", confidence: 0.9, bbox: { x0: 700, y0: 50, x1: 800, y1: 80 } },
        { text: "KOPI SUSU", confidence: 0.9, bbox: { x0: 50, y0: 50, x1: 220, y1: 80 } },
        { text: "DISCOUNT", confidence: 0.9, bbox: { x0: 50, y0: 100, x1: 220, y1: 130 } },
        { text: "-2.000", confidence: 0.9, bbox: { x0: 700, y0: 100, x1: 800, y1: 130 } },
        { text: "SUBTOTAL", confidence: 0.9, bbox: { x0: 500, y0: 150, x1: 650, y1: 180 } },
        { text: "18.000", confidence: 0.9, bbox: { x0: 700, y0: 150, x1: 800, y1: 180 } },
      ]),
    );

    expect(receipt.items).toEqual([
      {
        name: "KOPI SUSU",
        quantity: 1,
        unitPrice: 20_000,
        confidence: 0.9,
        source: "ocr",
      },
    ]);
    expect(receipt.subtotal).toBe(18_000);
  });

  it("extracts all priced rows from kerja nyata receipt text", () => {
    const receipt = interpretReceipt(
      candidate(`Pain Au Choco
DOUBLE CHOCO
17.000 x3 51.000
Salt Bread
KUNAFA PISTACHIO
18.000 x2 36. 000
Burnt Cheese Cup
BESAR
19.000 x1 19.000
Premium Matcha
ICE LARGE
17.000 x1 17.000
Croffee
ICE LARGE
17. 000 x1 17.000
Ceremonial Matcha | 5
LARGE
21.000 x2 42,000
Coffee Latte
ICE REGULAR
16.000 x1 15.000
Subtotal 214.000`),
    );

    expect(receipt.items).toEqual([
      { name: "Pain Au Choco DOUBLE CHOCO", quantity: 3, unitPrice: 17_000, confidence: 0.92, source: "ocr" },
      { name: "Salt Bread KUNAFA PISTACHIO", quantity: 2, unitPrice: 18_000, confidence: 0.92, source: "ocr" },
      { name: "Burnt Cheese Cup BESAR", quantity: 1, unitPrice: 19_000, confidence: 0.92, source: "ocr" },
      { name: "Premium Matcha ICE LARGE", quantity: 1, unitPrice: 17_000, confidence: 0.92, source: "ocr" },
      { name: "Croffee ICE LARGE", quantity: 1, unitPrice: 17_000, confidence: 0.92, source: "ocr" },
      { name: "Ceremonial Matcha LARGE", quantity: 2, unitPrice: 21_000, confidence: 0.92, source: "ocr" },
      { name: "Coffee Latte ICE REGULAR", quantity: 1, unitPrice: 15_000, confidence: 0.92, source: "ocr" },
    ]);
    expect(receipt.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)).toBe(197_000);
    expect(receipt.subtotal).toBe(214_000);
  });
});
