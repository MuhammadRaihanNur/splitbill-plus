import type { TransactionRecord } from "@/features/storage/models";
export function summarizeTransactions(rows: readonly TransactionRecord[]) {
  const total = rows.reduce((sum, row) => sum + row.grandTotal, 0);
  const categories = new Map<string, number>();
  const periods = new Map<string, number>();
  rows.forEach((row) => {
    categories.set(
      row.category,
      (categories.get(row.category) ?? 0) + row.grandTotal,
    );
    const period = row.createdAt.slice(0, 7);
    periods.set(period, (periods.get(period) ?? 0) + row.grandTotal);
  });
  return {
    total,
    count: rows.length,
    average: rows.length ? Math.round(total / rows.length) : 0,
    byCategory: [...categories].map(([name, value]) => ({ name, value })),
    byPeriod: [...periods]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value })),
  };
}
