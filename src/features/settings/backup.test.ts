import { beforeEach, describe, expect, it } from "vitest";
import { exportBackup, importBackup } from "@/features/settings/backup";
import { resetDatabase } from "@/test/reset-database";
import {
  participantRepository,
  settingsRepository,
} from "@/features/storage/repositories";
describe("backup", () => {
  beforeEach(resetDatabase);
  it("exports all stores and restores valid data", async () => {
    await participantRepository.create({ name: "Andi" });
    const backup = await exportBackup();
    expect(backup).toMatchObject({
      schemaVersion: 1,
      stores: { participants: [expect.objectContaining({ name: "Andi" })] },
    });
    await settingsRepository.update({ profileName: "Berubah" });
    await importBackup(backup);
    expect((await settingsRepository.get()).profileName).toBe("Raihan");
    expect(await participantRepository.list()).toHaveLength(1);
  });
  it("rejects newer versions without changing current data", async () => {
    await settingsRepository.update({ profileName: "Tetap" });
    const backup = await exportBackup();
    await expect(
      importBackup({ ...backup, schemaVersion: 99 }),
    ).rejects.toThrow("Versi backup tidak didukung");
    expect((await settingsRepository.get()).profileName).toBe("Tetap");
  });
  it("reports unsupported versions before validating a changed store shape", async () => {
    await expect(
      importBackup({ schemaVersion: 99, exportedAt: "future", stores: {} }),
    ).rejects.toThrow("Versi backup tidak didukung");
  });
  it("rejects incomplete transaction records before replacing data", async () => {
    const backup = await exportBackup();
    const malformed = {
      ...backup,
      stores: {
        ...backup.stores,
        transactions: [{ id: "broken", title: "Rusak", grandTotal: 10 }],
      },
    };
    await expect(importBackup(malformed)).rejects.toThrow();
    expect((await settingsRepository.get()).profileName).toBe("Raihan");
  });
});
