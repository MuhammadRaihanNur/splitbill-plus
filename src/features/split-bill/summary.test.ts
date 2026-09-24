import { describe, expect, it } from "vitest";
import { buildSplitSummary } from "@/features/split-bill/summary";
describe("buildSplitSummary", () => {
  it("creates a deterministic Indonesian summary", () => {
    expect(
      buildSplitSummary("Makan", 55000, [
        { participantId: "a", participantName: "Andi", amount: 55000 },
      ]),
    ).toBe("Makan\nTotal: Rp 55.000\n- Andi: Rp 55.000");
  });
});
