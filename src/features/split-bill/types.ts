import type {
  MoneySplit,
  ParticipantSnapshot,
} from "@/features/storage/models";

export interface ValidationIssue {
  code:
    | "invalid_amount"
    | "participants_required"
    | "custom_total_mismatch"
    | "owners_required"
    | "unsafe_integer";
  message: string;
}
export interface BillResult {
  subtotal: number;
  tax: number;
  serviceCharge: number;
  tip: number;
  grandTotal: number;
  splits: MoneySplit[];
}
export interface CalculationResult {
  value?: BillResult;
  issues: ValidationIssue[];
}
export interface BillInput {
  subtotal: number;
  taxBasisPoints: number;
  serviceBasisPoints: number;
  tip: number;
  participants: ParticipantSnapshot[];
}
export interface ItemInput {
  id: string;
  name: string;
  price: number;
  quantity: number;
  ownerIds: string[];
}
