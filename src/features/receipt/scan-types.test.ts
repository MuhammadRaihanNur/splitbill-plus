import { describe, expect, it } from "vitest";

import { clampConfidence, createFullImagePolygon } from "./scan-types";

describe("receipt scan contracts", () => {
  it("creates a bounded full-image fallback polygon", () => {
    expect(createFullImagePolygon(1200, 1600)).toEqual({
      topLeft: { x: 0, y: 0 },
      topRight: { x: 1200, y: 0 },
      bottomRight: { x: 1200, y: 1600 },
      bottomLeft: { x: 0, y: 1600 },
      confidence: 0,
      source: "full-image",
    });
    expect(clampConfidence(1.4)).toBe(1);
    expect(clampConfidence(-0.2)).toBe(0);
  });
});
