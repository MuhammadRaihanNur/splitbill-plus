import type {
  TransactionCategory,
  TransactionStatus,
} from "@/features/storage/models";
export interface HistoryFilters {
  query: string;
  category: TransactionCategory | "all";
  status: TransactionStatus | "all";
  groupId: string | "all";
  dateFrom: string;
  dateTo: string;
}
