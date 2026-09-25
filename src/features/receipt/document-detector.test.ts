import type { CV } from "@techstark/opencv-js";
import { describe, expect, it, vi } from "vitest";

import {
  detectReceiptPolygon,
  orderPolygon,
  scoreReceiptPolygon,
} from "./document-detector";

describe("receipt document geometry", () => {
  it("orders shuffled corners clockwise from the top-left", () => {
    expect(
      orderPolygon([
        { x: 900, y: 1400 },
        { x: 100, y: 100 },
        { x: 950, y: 120 },
        { x: 80, y: 1450 },
      ]),
    ).toEqual({
      topLeft: { x: 100, y: 100 },
      topRight: { x: 950, y: 120 },
      bottomRight: { x: 900, y: 1400 },
      bottomLeft: { x: 80, y: 1450 },
    });
  });

  it("gives a large centered receipt a strong score", () => {
    expect(
      scoreReceiptPolygon(
        [
          { x: 100, y: 80 },
          { x: 900, y: 80 },
          { x: 900, y: 1500 },
          { x: 100, y: 1500 },
        ],
        { width: 1000, height: 1600 },
      ),
    ).toBeGreaterThan(0.8);
  });

  it("falls back when OpenCV is unavailable", async () => {
    await expect(
      detectReceiptPolygon(
        document.createElement("canvas"),
        new AbortController().signal,
        async () => {
          throw new Error("OpenCV unavailable");
        },
      ),
    ).resolves.toBeUndefined();
  });

  it("releases every allocated OpenCV resource when cancelled", async () => {
    const controller = new AbortController();
    const resources = Array.from({ length: 6 }, () => ({
      delete: vi.fn(),
    }));
    let matrixIndex = 0;
    const cv = {
      Mat: vi.fn(() => resources[matrixIndex++]),
      MatVector: vi.fn(() => resources[matrixIndex++]),
      imread: vi.fn(() => resources[matrixIndex++]),
      cvtColor: vi.fn(),
      GaussianBlur: vi.fn(),
      Canny: vi.fn(),
      findContours: vi.fn(() => controller.abort()),
      Size: vi.fn(),
      COLOR_RGBA2GRAY: 0,
      RETR_EXTERNAL: 0,
      CHAIN_APPROX_SIMPLE: 0,
      BORDER_DEFAULT: 0,
    } as unknown as CV;

    await expect(
      detectReceiptPolygon(
        document.createElement("canvas"),
        controller.signal,
        async () => cv,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    for (const resource of resources) {
      expect(resource.delete).toHaveBeenCalledOnce();
    }
  });
});
