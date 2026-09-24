import Dexie, { type Table } from "dexie";

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

export class SplitBillDatabase extends Dexie {
  settings!: Table<AppSettings, "app">;
  participants!: Table<ParticipantRecord, string>;
  groups!: Table<GroupRecord, string>;
  transactions!: Table<TransactionRecord, string>;
  transactionItems!: Table<TransactionItemRecord, string>;
  taxCache!: Table<TaxCacheRecord, string>;
  drafts!: Table<SplitDraft, "active-split">;

  constructor(name = "splitbill-plus") {
    super(name);
    const stores = {
      settings: "id",
      participants: "id, name, updatedAt",
      groups: "id, name, updatedAt, *memberIds",
      transactions: "id, createdAt, category, groupId, status, title",
      transactionItems: "id, transactionId, *ownerIds",
      taxCache: "id, effectiveDate, fetchedAt",
      drafts: "id, updatedAt",
    };
    this.version(1).stores(stores);
    this.version(2)
      .stores(stores)
      .upgrade(async (transaction) => {
        const settings = transaction.table<AppSettings>("settings");
        const current = await settings.get("app");
        if (current?.theme === "system") {
          await settings.update("app", {
            theme: "light",
            updatedAt: new Date().toISOString(),
          });
        }
      });
    this.on("ready", async () => {
      if (!(await this.settings.get("app")))
        await this.settings.put(defaultSettings());
    });
  }
}

export const db = new SplitBillDatabase();
