import type { InterpretedReceipt, OcrCandidate } from "./scan-types";

function itemTotal(receipt: InterpretedReceipt): number {
  return receipt.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
}

export function hasReconciledSubtotal(receipt: InterpretedReceipt): boolean {
  if (receipt.subtotal === undefined || receipt.items.length === 0)
    return false;
  return itemTotal(receipt) === receipt.subtotal;
}

export function scoreCandidate(
  candidate: OcrCandidate,
  interpreted: InterpretedReceipt,
): number {
  const engineScore = Math.min(
    1,
    Math.max(0, candidate.engineConfidence / 100),
  );
  const interpretationScore = Math.min(1, Math.max(0, interpreted.confidence));
  const itemScore = Math.min(1, interpreted.items.length / 8);
  const reconciliationScore = hasReconciledSubtotal(interpreted) ? 1 : 0;
  const issuePenalty = Math.min(0.3, interpreted.issues.length * 0.08);

  return Math.min(
    1,
    Math.max(
      0,
      engineScore * 0.25 +
        interpretationScore * 0.25 +
        itemScore * 0.15 +
        reconciliationScore * 0.35 -
        issuePenalty,
    ),
  );
}

export function shouldStopScanning(
  score: number,
  interpreted: InterpretedReceipt,
): boolean {
  return (
    score >= 0.84 &&
    interpreted.confidence >= 0.8 &&
    hasReconciledSubtotal(interpreted) &&
    !interpreted.issues.some((issue) =>
      ["total-mismatch", "ambiguous-gap", "missing-subtotal"].includes(
        issue.code,
      ),
    )
  );
}
