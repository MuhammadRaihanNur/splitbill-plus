import { describe, expect, it } from "vitest";
import {
  calculateCustomSplit,
  calculateEqualSplit,
  calculateItemSplit,
} from "@/features/split-bill/calculator";
import {
  distributeByWeights,
  distributeExact,
  parseRupiah,
  percentageAmount,
} from "@/features/split-bill/money";

const people = [
  { id: "a", name: "Andi" },
  { id: "b", name: "Budi" },
  { id: "c", name: "Citra" },
];

describe("money and split calculator", () => {
  it("parses and distributes integer rupiah exactly", () => {
    expect(parseRupiah("Rp 1.250.000")).toBe(1_250_000);
    expect(percentageAmount(550_000, 1000)).toBe(55_000);
    expect(distributeExact(10, ["a", "b", "c"]).map((x) => x.amount)).toEqual([
      4, 3, 3,
    ]);
  });
  it("calculates equal split including proportional charges", () => {
    const result = calculateEqualSplit({
      subtotal: 100_000,
      taxBasisPoints: 1000,
      serviceBasisPoints: 500,
      tip: 5_000,
      participants: people,
    });
    expect(result.value?.grandTotal).toBe(120_000);
    expect(result.value?.splits.map((x) => x.amount)).toEqual([
      40_000, 40_000, 40_000,
    ]);
  });
  it("rejects custom totals that do not match", () => {
    const result = calculateCustomSplit({
      subtotal: 100_000,
      taxBasisPoints: 0,
      serviceBasisPoints: 0,
      tip: 0,
      participants: people,
      customAmounts: { a: 50_000, b: 20_000, c: 20_000 },
    });
    expect(result.issues[0]?.code).toBe("custom_total_mismatch");
  });
  it("splits item owners and rejects unsafe multiplication", () => {
    const result = calculateItemSplit({
      subtotal: 0,
      taxBasisPoints: 0,
      serviceBasisPoints: 0,
      tip: 1,
      participants: people,
      items: [
        { id: "i", name: "Menu", price: 10, quantity: 1, ownerIds: ["a", "b"] },
      ],
    });
    expect(result.value?.splits.map((x) => x.amount)).toEqual([6, 5, 0]);
    const unsafe = calculateItemSplit({
      subtotal: 0,
      taxBasisPoints: 0,
      serviceBasisPoints: 0,
      tip: 0,
      participants: people,
      items: [
        {
          id: "i",
          name: "Menu",
          price: Number.MAX_SAFE_INTEGER,
          quantity: 2,
          ownerIds: ["a"],
        },
      ],
    });
    expect(unsafe.issues[0]?.code).toBe("unsafe_integer");
  });
  it("rejects zero bills and incomplete items", () => {
    expect(
      calculateEqualSplit({
        subtotal: 0,
        taxBasisPoints: 0,
        serviceBasisPoints: 0,
        tip: 0,
        participants: people,
      }).issues[0]?.code,
    ).toBe("invalid_amount");
    expect(
      calculateItemSplit({
        subtotal: 0,
        taxBasisPoints: 0,
        serviceBasisPoints: 0,
        tip: 0,
        participants: people,
        items: [{ id: "i", name: "", price: 0, quantity: 1, ownerIds: ["a"] }],
      }).issues[0]?.code,
    ).toBe("invalid_amount");
  });
  it("distributes large safe integers without floating point drift", () => {
    expect(
      distributeByWeights(
        4_000_000_000_672_596,
        [2_000_000_000_581_663, 1_000_000_000_021_354, 500_000_000_665_364],
        ["a", "b", "c"],
      ),
    ).toEqual([
      2_285_714_285_935_054, 1_142_857_142_659_552, 571_428_572_077_990,
    ]);
  });
});
