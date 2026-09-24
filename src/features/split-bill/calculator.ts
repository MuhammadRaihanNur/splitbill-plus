import {
  distributeByWeights,
  distributeExact,
  MoneyError,
  percentageAmount,
  assertSafeNonNegativeInteger,
} from "@/features/split-bill/money";
import type {
  BillInput,
  CalculationResult,
  ItemInput,
} from "@/features/split-bill/types";

function issue(error: unknown): CalculationResult {
  const code = error instanceof MoneyError ? error.code : "invalid_amount";
  return {
    issues: [
      {
        code,
        message:
          code === "unsafe_integer"
            ? "Nilai melebihi batas aman"
            : "Nominal tidak valid",
      },
    ],
  };
}
function totals(input: BillInput, subtotal = input.subtotal) {
  if (subtotal <= 0) throw new MoneyError("invalid_amount");
  const tax = percentageAmount(subtotal, input.taxBasisPoints);
  const serviceCharge = percentageAmount(subtotal, input.serviceBasisPoints);
  assertSafeNonNegativeInteger(input.tip);
  const grandTotal = subtotal + tax + serviceCharge + input.tip;
  assertSafeNonNegativeInteger(grandTotal);
  return { subtotal, tax, serviceCharge, tip: input.tip, grandTotal };
}
function named(input: BillInput, amounts: number[]) {
  return input.participants.map((person, i) => ({
    participantId: person.id,
    participantName: person.name,
    amount: amounts[i] ?? 0,
  }));
}

export function calculateEqualSplit(input: BillInput): CalculationResult {
  try {
    const value = totals(input);
    const shares = distributeExact(
      value.grandTotal,
      input.participants.map((x) => x.id),
    );
    return {
      value: {
        ...value,
        splits: named(
          input,
          shares.map((x) => x.amount),
        ),
      },
      issues: [],
    };
  } catch (error) {
    return issue(error);
  }
}
export function calculateCustomSplit(
  input: BillInput & { customAmounts: Record<string, number> },
): CalculationResult {
  try {
    const value = totals(input);
    const amounts = input.participants.map(
      (x) => input.customAmounts[x.id] ?? 0,
    );
    amounts.forEach(assertSafeNonNegativeInteger);
    if (amounts.reduce((a, b) => a + b, 0) !== value.grandTotal)
      return {
        issues: [
          {
            code: "custom_total_mismatch",
            message: "Total pembagian harus sama dengan total tagihan",
          },
        ],
      };
    return { value: { ...value, splits: named(input, amounts) }, issues: [] };
  } catch (error) {
    return issue(error);
  }
}
export function calculateItemSplit(
  input: BillInput & { items: ItemInput[] },
): CalculationResult {
  try {
    if (!input.participants.length)
      throw new MoneyError("participants_required");
    const base = new Map(input.participants.map((x) => [x.id, 0]));
    let subtotal = 0;
    for (const item of input.items) {
      if (!item.name.trim() || item.price <= 0 || item.quantity <= 0)
        throw new MoneyError("invalid_amount");
      assertSafeNonNegativeInteger(item.price);
      assertSafeNonNegativeInteger(item.quantity);
      const itemTotal = item.price * item.quantity;
      if (!Number.isSafeInteger(itemTotal))
        throw new MoneyError("unsafe_integer");
      if (!item.ownerIds.length)
        return {
          issues: [
            {
              code: "owners_required",
              message: `Pilih pemilik untuk ${item.name}`,
            },
          ],
        };
      subtotal += itemTotal;
      assertSafeNonNegativeInteger(subtotal);
      distributeExact(itemTotal, item.ownerIds).forEach((share) =>
        base.set(
          share.participantId,
          (base.get(share.participantId) ?? 0) + share.amount,
        ),
      );
    }
    const value = totals(input, subtotal);
    const weights = input.participants.map((x) => base.get(x.id) ?? 0);
    const extras = distributeByWeights(
      value.tax + value.serviceCharge + value.tip,
      weights,
      input.participants.map((x) => x.id),
    );
    const amounts = weights.map((weight, i) => weight + extras[i]);
    return { value: { ...value, splits: named(input, amounts) }, issues: [] };
  } catch (error) {
    return issue(error);
  }
}
