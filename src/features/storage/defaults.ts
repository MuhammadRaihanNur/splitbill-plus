import type { AppSettings } from "@/features/storage/models";

export function defaultSettings(): AppSettings {
  return {
    id: "app",
    profileName: "Raihan",
    theme: "light",
    defaultTaxBasisPoints: 1100,
    defaultServiceBasisPoints: 0,
    updatedAt: new Date().toISOString(),
  };
}
