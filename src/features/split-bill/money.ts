export class MoneyError extends Error {
  constructor(
    public readonly code:
      "invalid_amount" | "participants_required" | "unsafe_integer",
  ) {
    super(code);
  }
}

export function assertSafeNonNegativeInteger(value: number): void {
  if (!Number.isSafeInteger(value)) throw new MoneyError("unsafe_integer");
  if (value < 0) throw new MoneyError("invalid_amount");
}
export function parseRupiah(value: string): number {
  const normalized = value.replace(/[^0-9-]/g, "");
  const amount = Number(normalized || 0);
  assertSafeNonNegativeInteger(amount);
  return amount;
}
export function percentageAmount(base: number, basisPoints: number): number {
  assertSafeNonNegativeInteger(base);
  assertSafeNonNegativeInteger(basisPoints);
  const numerator = base * basisPoints;
  if (!Number.isSafeInteger(numerator)) throw new MoneyError("unsafe_integer");
  return Math.floor((numerator + 5_000) / 10_000);
}
export function distributeExact(
  total: number,
  ids: readonly string[],
): { participantId: string; amount: number }[] {
  assertSafeNonNegativeInteger(total);
  if (!ids.length) throw new MoneyError("participants_required");
  const base = Math.floor(total / ids.length),
    remainder = total % ids.length;
  return ids.map((participantId, index) => ({
    participantId,
    amount: base + (index < remainder ? 1 : 0),
  }));
}
export function distributeByWeights(
  total: number,
  weights: readonly number[],
  ids: readonly string[],
): number[] {
  assertSafeNonNegativeInteger(total);
  weights.forEach(assertSafeNonNegativeInteger);
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const totalBigInt = BigInt(total);
  const sumBigInt = BigInt(sum);
  const products = weights.map((weight) => totalBigInt * BigInt(weight));
  const bases = products.map((product) => Number(product / sumBigInt));
  const remainder = total - bases.reduce((a, b) => a + b, 0);
  const ranking = weights
    .map((weight, index) => ({
      index,
      fraction: products[index] % sumBigInt,
      id: ids[index] ?? "",
    }))
    .sort((a, b) =>
      a.fraction === b.fraction
        ? a.id.localeCompare(b.id)
        : a.fraction > b.fraction
          ? -1
          : 1,
    );
  for (let i = 0; i < remainder; i += 1)
    bases[ranking[i % ranking.length].index] += 1;
  return bases;
}
