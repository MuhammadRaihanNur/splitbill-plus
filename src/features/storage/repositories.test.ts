import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { db, SplitBillDatabase } from "@/features/storage/db";
import { defaultSettings } from "@/features/storage/defaults";
import {
  draftRepository,
  groupRepository,
  participantRepository,
  settingsRepository,
  transactionRepository,
} from "@/features/storage/repositories";

describe("IndexedDB repositories", () => {
  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();
  });
  afterEach(() => db.close());

  it("initializes settings and persists participants, groups, and drafts", async () => {
    expect(await settingsRepository.get()).toMatchObject({
      theme: "light",
      defaultTaxBasisPoints: 1100,
    });
    await settingsRepository.update({
      profileName: "Raihan",
      defaultTaxBasisPoints: 1000,
    });
    const andi = await participantRepository.create({ name: "Andi" });
    const group = await groupRepository.create({
      name: "Anak Kantor",
      description: "Makan siang",
      emoji: "💼",
      memberIds: [andi.id],
    });
    await draftRepository.save({
      id: "active-split",
      title: "Makan siang",
      mode: "equal",
      subtotal: 120000,
      taxBasisPoints: 1000,
      serviceBasisPoints: 0,
      tip: 0,
      status: "completed",
      participantIds: [andi.id],
      customAmounts: {},
      items: [],
      groupId: group.id,
      updatedAt: new Date().toISOString(),
    });

    db.close();
    await db.open();
    expect(await settingsRepository.get()).toMatchObject({
      profileName: "Raihan",
      defaultTaxBasisPoints: 1000,
    });
    expect(await groupRepository.get(group.id)).toMatchObject({
      name: "Anak Kantor",
      memberIds: [andi.id],
    });
    expect(await draftRepository.get()).toMatchObject({
      title: "Makan siang",
      groupId: group.id,
    });
  });

  it("saves and deletes a transaction aggregate atomically while retaining group snapshots", async () => {
    const createdAt = "2026-09-24T00:00:00.000Z";
    const transaction = {
      id: "tx-1",
      title: "Bakso",
      category: "food" as const,
      groupId: "group-1",
      groupName: "Teman",
      participants: [{ id: "p-1", name: "Andi" }],
      subtotal: 50000,
      tax: 5000,
      serviceCharge: 0,
      tip: 0,
      grandTotal: 55000,
      splitMode: "equal" as const,
      splits: [
        { participantId: "p-1", participantName: "Andi", amount: 55000 },
      ],
      status: "completed" as const,
      createdAt,
      updatedAt: createdAt,
    };
    await transactionRepository.saveAggregate(transaction, [
      {
        id: "item-1",
        transactionId: "tx-1",
        name: "Bakso",
        price: 50000,
        quantity: 1,
        ownerIds: ["p-1"],
      },
    ]);
    expect(await transactionRepository.listByGroup("group-1")).toHaveLength(1);
    expect(
      (await transactionRepository.getAggregate("tx-1"))?.items,
    ).toHaveLength(1);
    await groupRepository.remove("group-1");
    expect((await transactionRepository.get("tx-1"))?.groupName).toBe("Teman");
    await transactionRepository.remove("tx-1");
    expect(await transactionRepository.getAggregate("tx-1")).toBeUndefined();
  });

  it("migrates the old system default to the brighter light theme", async () => {
    const databaseName = "splitbill-theme-migration-test";
    const legacy = new Dexie(databaseName);
    legacy.version(1).stores({ settings: "id" });
    await legacy.open();
    await legacy.table("settings").put({
      ...defaultSettings(),
      theme: "system",
    });
    legacy.close();

    const upgraded = new SplitBillDatabase(databaseName);
    await upgraded.open();
    expect((await upgraded.settings.get("app"))?.theme).toBe("light");
    upgraded.close();
    await Dexie.delete(databaseName);
  });
});
