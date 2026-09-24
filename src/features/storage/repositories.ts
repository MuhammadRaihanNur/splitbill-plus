import { db } from "@/features/storage/db";
import { defaultSettings } from "@/features/storage/defaults";
import type {
  AppSettings,
  GroupRecord,
  ParticipantRecord,
  SplitDraft,
  TaxCacheRecord,
  TransactionAggregate,
  TransactionItemRecord,
  TransactionRecord,
} from "@/features/storage/models";

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export const settingsRepository = {
  async get(): Promise<AppSettings> {
    const found = await db.settings.get("app");
    if (found) return found;
    const settings = defaultSettings();
    await db.settings.put(settings);
    return settings;
  },
  async update(
    changes: Partial<Omit<AppSettings, "id">>,
  ): Promise<AppSettings> {
    const next = {
      ...(await this.get()),
      ...changes,
      id: "app" as const,
      updatedAt: now(),
    };
    await db.settings.put(next);
    return next;
  },
};

export const participantRepository = {
  list: () => db.participants.orderBy("name").toArray(),
  get: (recordId: string) => db.participants.get(recordId),
  async create(
    input: Pick<ParticipantRecord, "name"> &
      Partial<Pick<ParticipantRecord, "phone">>,
  ): Promise<ParticipantRecord> {
    const timestamp = now();
    const record: ParticipantRecord = {
      id: id(),
      name: input.name.trim(),
      phone: input.phone?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.participants.add(record);
    return record;
  },
  async update(
    recordId: string,
    changes: Partial<Pick<ParticipantRecord, "name" | "phone">>,
  ) {
    await db.participants.update(recordId, { ...changes, updatedAt: now() });
    return db.participants.get(recordId);
  },
  remove: (recordId: string) => db.participants.delete(recordId),
};

export const groupRepository = {
  list: () => db.groups.orderBy("updatedAt").reverse().toArray(),
  get: (recordId: string) => db.groups.get(recordId),
  async create(
    input: Pick<GroupRecord, "name" | "description" | "emoji" | "memberIds">,
  ): Promise<GroupRecord> {
    const timestamp = now();
    const record = {
      ...input,
      id: id(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.groups.add(record);
    return record;
  },
  async update(
    recordId: string,
    changes: Partial<
      Pick<GroupRecord, "name" | "description" | "emoji" | "memberIds">
    >,
  ) {
    await db.groups.update(recordId, { ...changes, updatedAt: now() });
    return db.groups.get(recordId);
  },
  remove: (recordId: string) => db.groups.delete(recordId),
};

export const transactionRepository = {
  list: () => db.transactions.orderBy("createdAt").reverse().toArray(),
  get: (recordId: string) => db.transactions.get(recordId),
  listByGroup: (groupId: string) =>
    db.transactions
      .where("groupId")
      .equals(groupId)
      .reverse()
      .sortBy("createdAt"),
  async getAggregate(
    recordId: string,
  ): Promise<TransactionAggregate | undefined> {
    const transaction = await db.transactions.get(recordId);
    if (!transaction) return undefined;
    return {
      transaction,
      items: await db.transactionItems
        .where("transactionId")
        .equals(recordId)
        .toArray(),
    };
  },
  async saveAggregate(
    transaction: TransactionRecord,
    items: TransactionItemRecord[],
  ) {
    await db.transaction(
      "rw",
      db.transactions,
      db.transactionItems,
      async () => {
        await db.transactions.put(transaction);
        await db.transactionItems
          .where("transactionId")
          .equals(transaction.id)
          .delete();
        if (items.length) await db.transactionItems.bulkPut(items);
      },
    );
  },
  async remove(recordId: string) {
    await db.transaction(
      "rw",
      db.transactions,
      db.transactionItems,
      async () => {
        await db.transactionItems
          .where("transactionId")
          .equals(recordId)
          .delete();
        await db.transactions.delete(recordId);
      },
    );
  },
  clear: () =>
    db.transaction("rw", db.transactions, db.transactionItems, async () => {
      await db.transactionItems.clear();
      await db.transactions.clear();
    }),
};

export const draftRepository = {
  get: () => db.drafts.get("active-split"),
  save: (draft: SplitDraft) => db.drafts.put(draft),
  clear: () => db.drafts.delete("active-split"),
};
export const taxRepository = {
  list: () => db.taxCache.toArray(),
  putMany: (records: TaxCacheRecord[]) => db.taxCache.bulkPut(records),
  clear: () => db.taxCache.clear(),
};

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", db.tables, async () =>
    Promise.all(db.tables.map((table) => table.clear())),
  );
  await db.settings.put(defaultSettings());
}
