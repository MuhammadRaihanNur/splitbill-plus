import { z } from "zod";
import type { TaxProvider } from "@/features/tax/types";
import type { TaxCacheRecord } from "@/features/storage/models";
const recordSchema = z.object({
  id: z.string(),
  country: z.string(),
  name: z.string(),
  rateBasisPoints: z.number().int().nonnegative(),
  effectiveDate: z.string(),
  fetchedAt: z.string(),
});
export class BundledTaxProvider implements TaxProvider {
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  async fetchLatest(): Promise<TaxCacheRecord> {
    const response = await this.fetcher("/assets/tax-data.json", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Snapshot pajak tidak dapat dimuat");
    const records = z.array(recordSchema).parse(await response.json());
    const latest = records.sort((a, b) =>
      b.effectiveDate.localeCompare(a.effectiveDate),
    )[0];
    if (!latest) throw new Error("Snapshot pajak kosong");
    return latest;
  }
}
