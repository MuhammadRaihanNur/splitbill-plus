import { describe, expect, it } from "vitest";

import { calculatePerspectiveSize } from "./perspective";

describe("receipt perspective correction", () => {
  it("uses the longest opposing edges for the flattened canvas", () => {
    expect(
      calculatePerspectiveSize({
        topLeft: { x: 100, y: 100 },
        topRight: { x: 900, y: 120 },
        bottomRight: { x: 860, y: 1500 },
        bottomLeft: { x: 80, y: 1460 },
        confidence: 0.9,
        source: "automatic",
      }),
    ).toEqual({ width: 801, height: 1381 });
  });
});
