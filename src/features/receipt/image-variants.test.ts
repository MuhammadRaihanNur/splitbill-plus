import { describe, expect, it } from "vitest";

import { rotateDimensions, variantPlan } from "./image-variants";

describe("receipt image variants", () => {
  it("swaps dimensions for quarter-turn rotations", () => {
    expect(rotateDimensions(1200, 1600, 90)).toEqual({
      width: 1600,
      height: 1200,
    });
    expect(rotateDimensions(1200, 1600, 180)).toEqual({
      width: 1200,
      height: 1600,
    });
  });

  it("limits expensive variants on low-memory devices", () => {
    expect(variantPlan({ lowMemory: true, needsMorePasses: true })).toEqual([
      "grayscale",
      "adaptive-threshold",
    ]);
    expect(variantPlan({ lowMemory: false, needsMorePasses: true })).toEqual([
      "grayscale",
      "contrast",
      "adaptive-threshold",
      "otsu",
      "sharpen",
    ]);
  });
});
