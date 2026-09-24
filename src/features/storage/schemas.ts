import { z } from "zod";

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  settings: z.array(z.record(z.string(), z.unknown())),
  participants: z.array(z.record(z.string(), z.unknown())),
  groups: z.array(z.record(z.string(), z.unknown())),
  transactions: z.array(z.record(z.string(), z.unknown())),
  transactionItems: z.array(z.record(z.string(), z.unknown())),
  taxCache: z.array(z.record(z.string(), z.unknown())),
  drafts: z.array(z.record(z.string(), z.unknown())),
});
export type BackupPayload = z.infer<typeof backupSchema>;
