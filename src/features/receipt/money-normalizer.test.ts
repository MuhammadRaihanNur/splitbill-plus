import { describe, expect, it } from "vitest";

import { normalizeMoneyToken } from "./money-normalizer";

describe("normalizeMoneyToken", () => {
  it.each([
    ["Rp 17.000", 17_000],
    ["36. 000", 36_000],
    ["42,000", 42_000],
    ["I7.OOO", 17_000],
  ])("normalizes %s in numeric context", (text, expected) => {
    expect(normalizeMoneyToken(text, true)).toBe(expected);
  });

  it("does not mutate letters outside numeric context or accept malformed grouping", () => {
    expect(normalizeMoneyToken("I7.OOO", false)).toBeUndefined();
    expect(normalizeMoneyToken("17.00.0", true)).toBeUndefined();
  });
});
