import { describe, expect, it, vi } from "vitest";
import { BundledTaxProvider } from "@/features/tax/provider";
describe("BundledTaxProvider", () => {
  it("loads the latest bundled Indonesian tax snapshot", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "id-ppn",
          country: "Indonesia",
          name: "PPN",
          rateBasisPoints: 1100,
          effectiveDate: "2025-01-01",
          fetchedAt: "2026-09-24T00:00:00.000Z",
        },
      ],
    });
    const result = await new BundledTaxProvider(
      fetcher as unknown as typeof fetch,
    ).fetchLatest();
    expect(result).toMatchObject({ name: "PPN", rateBasisPoints: 1100 });
  });
});
