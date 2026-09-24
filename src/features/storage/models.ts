import type { Theme } from "@/features/settings/theme";

export type SplitMode = "equal" | "custom" | "item";
export type TransactionStatus = "completed" | "pending";
export type TransactionCategory =
  "food" | "transport" | "shopping" | "entertainment" | "other";

export interface AppSettings {
  id: "app";
  profileName: string;
  theme: Theme;
  defaultTaxBasisPoints: number;
  defaultServiceBasisPoints: number;
  updatedAt: string;
}
export interface ParticipantRecord {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}
export interface GroupRecord {
  id: string;
  name: string;
  description: string;
  emoji: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}
export interface ParticipantSnapshot {
  id: string;
  name: string;
}
export interface MoneySplit {
  participantId: string;
  participantName: string;
  amount: number;
}
export interface TransactionRecord {
  id: string;
  title: string;
  category: TransactionCategory;
  groupId?: string;
  groupName?: string;
  participants: ParticipantSnapshot[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  tip: number;
  grandTotal: number;
  splitMode: SplitMode;
  splits: MoneySplit[];
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}
export interface TransactionItemRecord {
  id: string;
  transactionId: string;
  name: string;
  price: number;
  quantity: number;
  ownerIds: string[];
}
export interface DraftItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  ownerIds: string[];
}
export interface SplitDraft {
  id: "active-split";
  title: string;
  mode: SplitMode;
  subtotal: number;
  taxBasisPoints: number;
  serviceBasisPoints: number;
  tip: number;
  status: TransactionStatus;
  participantIds: string[];
  customAmounts: Record<string, number>;
  items: DraftItem[];
  groupId?: string;
  updatedAt: string;
}
export interface TaxCacheRecord {
  id: string;
  country: string;
  name: string;
  rateBasisPoints: number;
  effectiveDate: string;
  fetchedAt: string;
}
export interface TransactionAggregate {
  transaction: TransactionRecord;
  items: TransactionItemRecord[];
}
