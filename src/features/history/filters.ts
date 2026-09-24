import type { TransactionRecord } from "@/features/storage/models";
import type { HistoryFilters } from "@/features/history/types";
export function filterTransactions(
  rows: readonly TransactionRecord[],
  filters: HistoryFilters,
): TransactionRecord[] {
  const query = filters.query.trim().toLocaleLowerCase("id");
  return rows.filter((row) => {
    const haystack =
      `${row.title} ${row.groupName ?? ""} ${row.participants.map((x) => x.name).join(" ")}`.toLocaleLowerCase(
        "id",
      );
    return (
      (!query || haystack.includes(query)) &&
      (filters.category === "all" || row.category === filters.category) &&
      (filters.status === "all" || row.status === filters.status) &&
      (filters.groupId === "all" ||
        row.groupId === filters.groupId ||
        row.groupName === filters.groupId) &&
      (!filters.dateFrom || row.createdAt >= `${filters.dateFrom}T00:00:00`) &&
      (!filters.dateTo || row.createdAt <= `${filters.dateTo}T23:59:59.999`)
    );
  });
}
