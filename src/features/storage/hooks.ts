"use client";

import { useLiveQuery } from "dexie-react-hooks";
import type {
  GroupRecord,
  ParticipantRecord,
  TransactionRecord,
} from "@/features/storage/models";
import {
  groupRepository,
  participantRepository,
  transactionRepository,
} from "@/features/storage/repositories";

export type QueryState<T> =
  | { status: "loading" }
  | { status: "empty"; data: T }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };
function listState<T>(value: T[] | undefined): QueryState<T[]> {
  if (!value) return { status: "loading" };
  return value.length
    ? { status: "success", data: value }
    : { status: "empty", data: value };
}
export function useParticipants(): QueryState<ParticipantRecord[]> {
  return listState(useLiveQuery(() => participantRepository.list()));
}
export function useGroups(): QueryState<GroupRecord[]> {
  return listState(useLiveQuery(() => groupRepository.list()));
}
export function useTransactions(): QueryState<TransactionRecord[]> {
  return listState(useLiveQuery(() => transactionRepository.list()));
}
