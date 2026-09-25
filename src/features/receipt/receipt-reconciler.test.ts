import { describe, expect, it } from "vitest";

import type { InterpretedReceipt } from "./scan-types";
import { reconcileReceipt } from "./receipt-reconciler";

function receipt(overrides: Partial<InterpretedReceipt> = {}): InterpretedReceipt {
  return {
    items: [{ name: "Item terbaca", quantity: 1, unitPrice: 197_000 }],
    subtotal: 214_000,
    confidence: 0.8,
    issues: [],
    sourceCandidateId: "candidate",
    ...overrides,
  };
}

describe("reconcileReceipt", () => {
  it("infers one visible low-confidence item for one unpriced name", () => {
    const output = reconcileReceipt(
      receipt({ unresolvedItems: ["Coffee Latte ICE LARGE"] }),
    );

    expect(output.items.at(-1)).toEqual({
      name: "Coffee Latte ICE LARGE",
      quantity: 1,
      unitPrice: 17_000,
      estimated: true,
      confidence: 0.45,
      source: "estimated",
    });
    expect(output.issues).toContainEqual(
      expect.objectContaining({ code: "total-mismatch" }),
    );
  });

  it("does not split one gap across two unresolved names", () => {
    const output = reconcileReceipt(
      receipt({
        subtotal: 231_000,
        unresolvedItems: ["Coffee Latte", "Croissant"],
      }),
    );

    expect(output.items).toHaveLength(1);
    expect(output.issues).toContainEqual(
      expect.objectContaining({ code: "ambiguous-gap" }),
    );
  });

  it("keeps a detected adjustment separate instead of inventing an item", () => {
    const output = reconcileReceipt(
      receipt({ subtotal: 207_000, discount: 10_000 }),
    );

    expect(output.items).toHaveLength(1);
    expect(output.discount).toBe(10_000);
    expect(output.issues).not.toContainEqual(
      expect.objectContaining({ code: "total-mismatch" }),
    );
  });

  it("leaves an already exact receipt without reconciliation issues", () => {
    const output = reconcileReceipt(receipt({ subtotal: 197_000 }));
    expect(output.items).toHaveLength(1);
    expect(output.issues).toEqual([]);
  });

  it("reports a lower subtotal without creating a negative item", () => {
    const output = reconcileReceipt(receipt({ subtotal: 190_000 }));
    expect(output.items).toHaveLength(1);
    expect(output.issues).toContainEqual(
      expect.objectContaining({ code: "total-mismatch" }),
    );
  });

  it("rejects unsafe receipt arithmetic", () => {
    expect(() =>
      reconcileReceipt(
        receipt({
          items: [
            {
              name: "Nilai rusak",
              quantity: Number.MAX_SAFE_INTEGER,
              unitPrice: 2,
            },
          ],
        }),
      ),
    ).toThrow(RangeError);
  });
});
