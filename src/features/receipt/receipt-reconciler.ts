import type { InterpretedReceipt, ReceiptIssue } from "./scan-types";

function sumItems(receipt: InterpretedReceipt): number {
  let total = 0;
  for (const item of receipt.items) {
    const lineTotal = item.quantity * item.unitPrice;
    if (!Number.isSafeInteger(lineTotal)) {
      throw new RangeError("Nilai item struk melebihi batas bilangan aman.");
    }
    total += lineTotal;
    if (!Number.isSafeInteger(total)) {
      throw new RangeError("Total struk melebihi batas bilangan aman.");
    }
  }
  return total;
}

function withoutReconciliationIssues(issues: ReceiptIssue[]): ReceiptIssue[] {
  return issues.filter(
    (issue) => !["total-mismatch", "ambiguous-gap"].includes(issue.code),
  );
}

export function reconcileReceipt(
  receipt: InterpretedReceipt,
): InterpretedReceipt {
  const issues = withoutReconciliationIssues(receipt.issues);
  if (receipt.subtotal === undefined) return { ...receipt, issues };
  if (!Number.isSafeInteger(receipt.subtotal) || receipt.subtotal < 0) {
    throw new RangeError("Subtotal struk bukan bilangan aman.");
  }

  const itemTotal = sumItems(receipt);
  const adjustment = receipt.discount ?? 0;
  if (!Number.isSafeInteger(adjustment) || adjustment < 0) {
    throw new RangeError("Penyesuaian struk bukan bilangan aman.");
  }
  const accountedTotal = itemTotal + adjustment;
  if (!Number.isSafeInteger(accountedTotal)) {
    throw new RangeError("Rekonsiliasi struk melebihi batas bilangan aman.");
  }
  if (accountedTotal === receipt.subtotal) return { ...receipt, issues };

  const difference = receipt.subtotal - itemTotal;
  const unresolved = (receipt.unresolvedItems ?? [])
    .map((name) => name.trim())
    .filter(Boolean);
  if (
    adjustment === 0 &&
    unresolved.length === 1 &&
    difference > 0 &&
    Number.isSafeInteger(difference)
  ) {
    return {
      ...receipt,
      items: [
        ...receipt.items,
        {
          name: unresolved[0],
          quantity: 1,
          unitPrice: difference,
          estimated: true,
          confidence: Math.min(0.45, receipt.confidence),
          source: "estimated",
        },
      ],
      issues: [
        ...issues,
        {
          code: "total-mismatch",
          message: `Harga ${unresolved[0]} diperkirakan dari selisih subtotal dan perlu diperiksa.`,
        },
      ],
    };
  }

  if (unresolved.length > 1 && difference > 0) {
    return {
      ...receipt,
      issues: [
        ...issues,
        {
          code: "ambiguous-gap",
          message:
            "Beberapa nama item belum memiliki harga; selisih tidak dibagi otomatis.",
        },
      ],
    };
  }

  return {
    ...receipt,
    issues: [
      ...issues,
      {
        code: "total-mismatch",
        message: `Jumlah item berbeda Rp${Math.abs(receipt.subtotal - accountedTotal).toLocaleString("id-ID")} dari subtotal.`,
      },
    ],
  };
}
