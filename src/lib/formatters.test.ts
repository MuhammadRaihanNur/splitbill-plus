import { describe, expect, it } from "vitest";

import { formatRupiah } from "@/lib/formatters";

describe("formatRupiah", () => {
  it("formats an integer amount using Indonesian thousands separators", () => {
    expect(formatRupiah(2_450_000)).toBe("Rp 2.450.000");
  });

  it("rejects unsafe or fractional money values", () => {
    expect(() => formatRupiah(10.5)).toThrow("bilangan bulat aman");
    expect(() => formatRupiah(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      "bilangan bulat aman",
    );
  });
});
