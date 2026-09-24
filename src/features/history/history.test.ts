import { describe, expect, it } from "vitest";
import { filterTransactions } from "@/features/history/filters";
import { summarizeTransactions } from "@/features/history/analytics";
import { buildCsv } from "@/features/history/csv";
import type { TransactionRecord } from "@/features/storage/models";
const record = (partial: Partial<TransactionRecord>): TransactionRecord => ({
  id: "1",
  title: "Makan Kantor",
  category: "food",
  participants: [],
  subtotal: 100000,
  tax: 10000,
  serviceCharge: 0,
  tip: 0,
  grandTotal: 110000,
  splitMode: "equal",
  splits: [],
  status: "completed",
  createdAt: "2026-09-24T00:00:00.000Z",
  updatedAt: "2026-09-24T00:00:00.000Z",
  ...partial,
});
describe("history utilities", () => {
  it("combines query, category, group, and status filters", () => {
    const rows = [
      record({ groupName: "Anak Kantor" }),
      record({
        id: "2",
        title: "Taksi",
        category: "transport",
        status: "pending",
      }),
    ];
    expect(
      filterTransactions(rows, {
        query: "kantor",
        category: "food",
        status: "completed",
        groupId: "all",
        dateFrom: "",
        dateTo: "",
      }),
    ).toHaveLength(1);
  });
  it("summarizes integer transactions", () => {
    expect(
      summarizeTransactions([
        record({ grandTotal: 100 }),
        record({ id: "2", grandTotal: 201 }),
      ]),
    ).toMatchObject({ total: 301, count: 2, average: 151 });
  });
  it("escapes CSV fields with BOM", () => {
    expect(buildCsv([record({ title: 'Makan "Bersama", kantor' })])).toContain(
      '"Makan ""Bersama"", kantor"',
    );
    expect(buildCsv([]).startsWith("\uFEFFTanggal,Judul")).toBe(true);
  });
});
