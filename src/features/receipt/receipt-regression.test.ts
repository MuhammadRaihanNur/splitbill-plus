import { describe, expect, it } from "vitest";

import { interpretReceipt } from "./receipt-interpreter";
import { reconcileReceipt } from "./receipt-reconciler";
import type { OcrCandidate, OcrLine, RightAngle } from "./scan-types";

function scan(
  rawText: string,
  lines: OcrLine[] = [],
  orientation: RightAngle = 0,
) {
  const candidate: OcrCandidate = {
    id: `fixture-${orientation}`,
    rawText,
    lines,
    engineConfidence: 92,
    orientation,
    preprocessing: "grayscale",
    durationMs: 10,
  };
  return reconcileReceipt(interpretReceipt(candidate));
}

function coreItems(receipt: ReturnType<typeof scan>) {
  return receipt.items.map(({ name, quantity, unitPrice, source }) => ({
    name,
    quantity,
    unitPrice,
    source,
  }));
}

describe("receipt cross-format regression", () => {
  it("reads an upright minimarket receipt", () => {
    const receipt = scan("2 Beras 45.000\n1 Susu 18.000\nSubtotal 108.000");
    expect(coreItems(receipt)).toEqual([
      { name: "Beras", quantity: 2, unitPrice: 45_000, source: "ocr" },
      { name: "Susu", quantity: 1, unitPrice: 18_000, source: "ocr" },
    ]);
    expect(receipt.subtotal).toBe(108_000);
    expect(receipt.issues).toEqual([]);
  });

  it("restores a 90-degree OCR token order", () => {
    const receipt = scan(
      "",
      [
        {
          text: "20.000",
          confidence: 0.9,
          bbox: { x0: 600, y0: 100, x1: 700, y1: 130 },
        },
        {
          text: "KOPI",
          confidence: 0.9,
          bbox: { x0: 50, y0: 100, x1: 130, y1: 130 },
        },
        {
          text: "1",
          confidence: 0.9,
          bbox: { x0: 350, y0: 100, x1: 370, y1: 130 },
        },
        {
          text: "20.000",
          confidence: 0.9,
          bbox: { x0: 800, y0: 100, x1: 900, y1: 130 },
        },
        {
          text: "SUBTOTAL",
          confidence: 0.9,
          bbox: { x0: 500, y0: 180, x1: 650, y1: 210 },
        },
        {
          text: "20.000",
          confidence: 0.9,
          bbox: { x0: 800, y0: 180, x1: 900, y1: 210 },
        },
      ],
      90,
    );
    expect(coreItems(receipt)).toEqual([
      { name: "KOPI", quantity: 1, unitPrice: 20_000, source: "ocr" },
    ]);
    expect(receipt.subtotal).toBe(20_000);
  });

  it("groups a perspective-drifted restaurant row", () => {
    const receipt = scan("", [
      {
        text: "Mie Ayam",
        confidence: 0.88,
        bbox: { x0: 40, y0: 100, x1: 220, y1: 140 },
      },
      {
        text: "2",
        confidence: 0.9,
        bbox: { x0: 350, y0: 112, x1: 370, y1: 145 },
      },
      {
        text: "15.000",
        confidence: 0.9,
        bbox: { x0: 520, y0: 108, x1: 620, y1: 144 },
      },
      {
        text: "30.000",
        confidence: 0.9,
        bbox: { x0: 760, y0: 114, x1: 870, y1: 148 },
      },
      {
        text: "Subtotal",
        confidence: 0.9,
        bbox: { x0: 500, y0: 210, x1: 650, y1: 240 },
      },
      {
        text: "30.000",
        confidence: 0.9,
        bbox: { x0: 760, y0: 210, x1: 870, y1: 240 },
      },
    ]);
    expect(coreItems(receipt)).toEqual([
      { name: "Mie Ayam", quantity: 2, unitPrice: 15_000, source: "ocr" },
    ]);
    expect(receipt.issues).toEqual([]);
  });

  it("normalizes uneven café spacing", () => {
    const receipt = scan("Salt Bread\n18.000 x2 36. 000\nSubtotal 36.000");
    expect(coreItems(receipt)).toEqual([
      { name: "Salt Bread", quantity: 2, unitPrice: 18_000, source: "ocr" },
    ]);
    expect(receipt.subtotal).toBe(36_000);
  });

  it("keeps discount and service rows separate from merchandise", () => {
    const receipt = scan(
      "Paket Makan 197.000\nService 10.000\nDiscount -10.000\nSubtotal 207.000",
    );
    expect(coreItems(receipt)).toEqual([
      { name: "Paket Makan", quantity: 1, unitPrice: 197_000, source: "ocr" },
    ]);
    expect(receipt.serviceCharge).toBe(10_000);
    expect(receipt.discount).toBe(10_000);
    expect(receipt.issues).toEqual([]);
  });

  it("flags several unpriced trailing names instead of splitting the gap", () => {
    const receipt = scan("Teh 10.000\nRoti Bakar\nSusu Segar\nSubtotal 44.000");
    expect(coreItems(receipt)).toEqual([
      { name: "Teh", quantity: 1, unitPrice: 10_000, source: "ocr" },
    ]);
    expect(receipt.issues).toContainEqual(
      expect.objectContaining({ code: "ambiguous-gap" }),
    );
  });

  it("reconciles kerja nyata OCR only through one visible estimate", () => {
    const receipt = scan(`Pain Au Choco
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
Coffee Latte
ICE LARGE
Subtotal 214.000`);

    expect(receipt.items).toHaveLength(8);
    expect(receipt.items.at(-1)).toEqual(
      expect.objectContaining({
        name: "Coffee Latte ICE LARGE",
        unitPrice: 17_000,
        source: "estimated",
        estimated: true,
      }),
    );
    expect(
      receipt.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      ),
    ).toBe(214_000);
    expect(receipt.issues).toContainEqual(
      expect.objectContaining({ code: "total-mismatch" }),
    );
  });
});
