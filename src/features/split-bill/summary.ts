import type { MoneySplit } from "@/features/storage/models";
import { formatRupiah } from "@/lib/formatters";
export function buildSplitSummary(
  title: string,
  total: number,
  splits: MoneySplit[],
): string {
  return [
    title,
    `Total: ${formatRupiah(total)}`,
    ...splits.map(
      (split) => `- ${split.participantName}: ${formatRupiah(split.amount)}`,
    ),
  ].join("\n");
}
