export function normalizeMoneyToken(
  text: string,
  numericContext: boolean,
): number | undefined {
  let normalized = text.trim().replace(/^rp\s*/i, "").replace(/\s+/g, "");
  if (!numericContext && /[A-Za-z]/.test(normalized)) return undefined;
  if (numericContext) {
    normalized = normalized.replace(/[Oo]/g, "0").replace(/[Il]/g, "1").replace(/[Ss]/g, "5");
  }
  if (!/^-?\d+$/.test(normalized) && !/^-?\d{1,3}(?:[.,]\d{3})+$/.test(normalized)) {
    return undefined;
  }
  const value = Number(normalized.replace(/[.,]/g, ""));
  return Number.isSafeInteger(value) ? value : undefined;
}
