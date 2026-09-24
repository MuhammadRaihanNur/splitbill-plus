import { z } from "zod";
import { db } from "@/features/storage/db";
import { defaultSettings } from "@/features/storage/defaults";
import type {
  AppSettings,
  GroupRecord,
  ParticipantRecord,
  SplitDraft,
  TaxCacheRecord,
  TransactionItemRecord,
  TransactionRecord,
} from "@/features/storage/models";

export interface BackupData {
  schemaVersion: number;
  exportedAt: string;
  stores: {
    settings: AppSettings[];
    participants: ParticipantRecord[];
    groups: GroupRecord[];
    transactions: TransactionRecord[];
    transactionItems: TransactionItemRecord[];
    taxCache: TaxCacheRecord[];
    drafts: SplitDraft[];
  };
}
const money = z.number().int().nonnegative().safe();
const timestamped = { createdAt: z.string(), updatedAt: z.string() };
const settingsSchema = z.object({
  id: z.literal("app"),
  profileName: z.string(),
  theme: z.enum(["light", "dark", "system"]),
  defaultTaxBasisPoints: money,
  defaultServiceBasisPoints: money,
  updatedAt: z.string(),
});
const participantSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().optional(),
  ...timestamped,
});
const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  emoji: z.string(),
  memberIds: z.array(z.string()),
  ...timestamped,
});
const snapshotSchema = z.object({ id: z.string(), name: z.string() });
const splitSchema = z.object({
  participantId: z.string(),
  participantName: z.string(),
  amount: money,
});
const transactionSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(["food", "transport", "shopping", "entertainment", "other"]),
  groupId: z.string().optional(),
  groupName: z.string().optional(),
  participants: z.array(snapshotSchema),
  subtotal: money,
  tax: money,
  serviceCharge: money,
  tip: money,
  grandTotal: money,
  splitMode: z.enum(["equal", "custom", "item"]),
  splits: z.array(splitSchema),
  status: z.enum(["completed", "pending"]),
  ...timestamped,
});
const itemSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  name: z.string(),
  price: money,
  quantity: money,
  ownerIds: z.array(z.string()),
});
const taxSchema = z.object({
  id: z.string(),
  country: z.string(),
  name: z.string(),
  rateBasisPoints: money,
  effectiveDate: z.string(),
  fetchedAt: z.string(),
});
const draftItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: money,
  quantity: money,
  ownerIds: z.array(z.string()),
});
const draftSchema = z.object({
  id: z.literal("active-split"),
  title: z.string(),
  mode: z.enum(["equal", "custom", "item"]),
  subtotal: money,
  taxBasisPoints: money,
  serviceBasisPoints: money,
  tip: money,
  status: z.enum(["completed", "pending"]),
  participantIds: z.array(z.string()),
  customAmounts: z.record(z.string(), money),
  items: z.array(draftItemSchema),
  groupId: z.string().optional(),
  updatedAt: z.string(),
});

const envelope = z.object({
  schemaVersion: z.number().int(),
  exportedAt: z.string(),
  stores: z.object({
    settings: z.array(settingsSchema),
    participants: z.array(participantSchema),
    groups: z.array(groupSchema),
    transactions: z.array(transactionSchema),
    transactionItems: z.array(itemSchema),
    taxCache: z.array(taxSchema),
    drafts: z.array(draftSchema),
  }),
});
export async function exportBackup(): Promise<BackupData> {
  const [
    settings,
    participants,
    groups,
    transactions,
    transactionItems,
    taxCache,
    drafts,
  ] = await Promise.all([
    db.settings.toArray(),
    db.participants.toArray(),
    db.groups.toArray(),
    db.transactions.toArray(),
    db.transactionItems.toArray(),
    db.taxCache.toArray(),
    db.drafts.toArray(),
  ]);
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    stores: {
      settings,
      participants,
      groups,
      transactions,
      transactionItems,
      taxCache,
      drafts,
    },
  };
}
export async function importBackup(input: unknown): Promise<void> {
  const version = z
    .object({ schemaVersion: z.number().int() })
    .passthrough()
    .parse(input);
  if (version.schemaVersion !== 1)
    throw new Error("Versi backup tidak didukung");
  const parsed = envelope.parse(input);
  const stores = parsed.stores as unknown as BackupData["stores"];
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    if (stores.settings.length) await db.settings.bulkPut(stores.settings);
    if (stores.participants.length)
      await db.participants.bulkPut(stores.participants);
    if (stores.groups.length) await db.groups.bulkPut(stores.groups);
    if (stores.transactions.length)
      await db.transactions.bulkPut(stores.transactions);
    if (stores.transactionItems.length)
      await db.transactionItems.bulkPut(stores.transactionItems);
    if (stores.taxCache.length) await db.taxCache.bulkPut(stores.taxCache);
    if (stores.drafts.length) await db.drafts.bulkPut(stores.drafts);
  });
}
export async function clearApplicationData(): Promise<void> {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await db.settings.put(defaultSettings());
  });
}
export function downloadBackup(data: BackupData): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `splitbill-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
