import type { ParsedReceiptItem } from "@/features/receipt/types";
import { normalizeMoneyToken } from "@/features/receipt/money-normalizer";

const ignoredName =
  /^(?:sub\s*total|grand\s+total|total|qris|tunai|cash|pajak|tax|service|payment|pembayaran|kasir|penjualan|instagram|contact|transfer|powered)\b/i;
const moneyToken = String.raw`\d+(?:[.,]\d{3})*`;
const detailPattern = new RegExp(
  String.raw`(?:Rp\s*)?(${moneyToken})\s*[xX×]\s*(\d+)\s+(?:Rp\s*)?(${moneyToken})`,
  "i",
);
const legacyPattern = new RegExp(
  String.raw`^(\d+)\s+(.+?)\s+(?:Rp\s*)?(${moneyToken})$`,
  "i",
);
const subtotalPattern = new RegExp(
  String.raw`^sub\s*total\s+(?:Rp\s*)?(${moneyToken})`,
  "i",
);

function normalizeNumberSpacing(line: string): string {
  return line.replace(/(\d)[.,]\s+(?=\d{3}\b)/g, "$1.");
}

function parseMoney(value: string): number {
  return normalizeMoneyToken(value, true) ?? Number(value.replace(/\D/g, ""));
}

function cleanNameLine(line: string): string {
  return line
    .replace(/^[^A-Za-zÀ-ÿ0-9]+/, "")
    .replace(/\s*[|\\:]+\s*\d*\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function validItem(
  name: string,
  quantity: number,
  unitPrice: number,
  estimated = false,
): ParsedReceiptItem | null {
  if (
    !name ||
    ignoredName.test(name) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    !Number.isSafeInteger(unitPrice) ||
    unitPrice < 1 ||
    !Number.isSafeInteger(quantity * unitPrice)
  )
    return null;
  return estimated
    ? { name, quantity, unitPrice, estimated: true }
    : { name, quantity, unitPrice };
}

export function parseReceiptText(text: string): ParsedReceiptItem[] {
  const items: ParsedReceiptItem[] = [];
  let nameLines: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = normalizeNumberSpacing(rawLine.trim());
    if (!line) continue;

    const subtotal = line.match(subtotalPattern);
    if (subtotal) {
      const expectedTotal = parseMoney(subtotal[1]);
      const detectedTotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
      const difference = expectedTotal - detectedTotal;
      if (
        nameLines.length > 0 &&
        nameLines.length <= 2 &&
        Number.isSafeInteger(difference) &&
        difference > 0
      ) {
        const name = nameLines.map(cleanNameLine).filter(Boolean).join(" ");
        const item = validItem(name, 1, difference, true);
        if (item) items.push(item);
      }
      nameLines = [];
      continue;
    }

    const detail = line.match(detailPattern);
    if (detail) {
      const quantity = Number(detail[2]);
      const scannedUnitPrice = parseMoney(detail[1]);
      const total = parseMoney(detail[3]);
      const derivedUnitPrice = total / quantity;
      const unitPrice =
        scannedUnitPrice * quantity === total ||
        !Number.isSafeInteger(derivedUnitPrice)
          ? scannedUnitPrice
          : derivedUnitPrice;
      const name = nameLines
        .slice(-2)
        .map(cleanNameLine)
        .filter(Boolean)
        .join(" ");
      const item = validItem(name, quantity, unitPrice);
      if (item) items.push(item);
      nameLines = [];
      continue;
    }

    const legacy = line.match(legacyPattern);
    if (legacy) {
      const item = validItem(
        cleanNameLine(legacy[2]),
        Number(legacy[1]),
        parseMoney(legacy[3]),
      );
      if (item) items.push(item);
      nameLines = [];
      continue;
    }

    const candidate = cleanNameLine(line);
    if (/^[A-Za-zÀ-ÿ]/.test(candidate) && !ignoredName.test(candidate)) {
      nameLines.push(candidate);
    }
  }

  return items;
}
