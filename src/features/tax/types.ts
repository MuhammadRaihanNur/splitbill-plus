import type { TaxCacheRecord } from "@/features/storage/models";
export interface TaxProvider {
  fetchLatest(): Promise<TaxCacheRecord>;
}
