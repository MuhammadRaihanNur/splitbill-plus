import { groupWordsIntoRows } from "./layout-grouper";
import { normalizeMoneyToken } from "./money-normalizer";
import { parseReceiptText } from "./parser";
import type {
  InterpretedReceipt,
  OcrCandidate,
  ReceiptIssue,
} from "./scan-types";
import type { ParsedReceiptItem } from "./types";

interface TextRow {
  text: string;
  confidence: number;
}

const numericToken = String.raw`(?:Rp\s*)?-?(?=[0-9IlOS.,\s]*[0-9])[0-9IlOS]+(?:[.,]\s*[0-9IlOS]+)*`;
const ignoredItem = /^(?:sub\s*total|grand\s+total|total|tax|pajak|service|tip|discount|diskon|cash|tunai|qris|payment|pembayaran)\b/i;

function rowsFromCandidate(candidate: OcrCandidate): TextRow[] {
  const grouped = groupWordsIntoRows(candidate.lines);
  if (grouped.length > 0) {
    return grouped.map((row) => ({ text: row.text, confidence: row.confidence }));
  }
  const confidence = Math.min(1, Math.max(0, candidate.engineConfidence / 100));
  return candidate.rawText
    .split(/\r?\n/)
    .map((text) => ({ text: text.trim(), confidence }))
    .filter((row) => row.text.length > 0);
}

function cleanName(value: string): string {
  return value
    .replace(/^[^A-Za-zÀ-ÿ0-9]+/, "")
    .replace(/\s*[|\\:]+\s*\d*\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lastMoney(text: string): number | undefined {
  const matches = [...text.matchAll(new RegExp(numericToken, "gi"))];
  const token = matches.at(-1)?.[0];
  return token ? normalizeMoneyToken(token, true) : undefined;
}

function safeItem(
  name: string,
  quantity: number,
  unitPrice: number,
  confidence: number,
): ParsedReceiptItem | undefined {
  const cleaned = cleanName(name);
  if (
    !cleaned ||
    ignoredItem.test(cleaned) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    !Number.isSafeInteger(unitPrice) ||
    unitPrice < 1 ||
    !Number.isSafeInteger(quantity * unitPrice)
  ) {
    return undefined;
  }
  return {
    name: cleaned,
    quantity,
    unitPrice,
    confidence: Math.min(1, Math.max(0, confidence)),
    source: "ocr",
  };
}

function addUnique(items: ParsedReceiptItem[], item: ParsedReceiptItem): void {
  const key = `${item.name.toLowerCase().replace(/\s+/g, " ")}|${item.quantity}|${item.unitPrice}`;
  const duplicate = items.some(
    (existing) =>
      `${existing.name.toLowerCase().replace(/\s+/g, " ")}|${existing.quantity}|${existing.unitPrice}` === key,
  );
  if (!duplicate) items.push(item);
}

export function interpretReceipt(candidate: OcrCandidate): InterpretedReceipt {
  const rows = rowsFromCandidate(candidate);
  const items: ParsedReceiptItem[] = [];
  const pendingNames: TextRow[] = [];
  let subtotal: number | undefined;
  let tax: number | undefined;
  let serviceCharge: number | undefined;
  let grandTotal: number | undefined;

  for (const row of rows) {
    const text = row.text.replace(/(\d)[.,]\s+(?=[0-9IlOS]{3}\b)/g, "$1.");
    const lower = text.toLowerCase();
    const classifiedAmount = lastMoney(text);
    if (/\bsub\s*total\b/i.test(text)) {
      subtotal = classifiedAmount;
      pendingNames.length = 0;
      continue;
    }
    if (/\bgrand\s+total\b/i.test(text) || /^total\b/i.test(text)) {
      grandTotal = classifiedAmount;
      pendingNames.length = 0;
      continue;
    }
    if (/^(?:tax|pajak)\b/i.test(text)) {
      tax = classifiedAmount;
      continue;
    }
    if (/^service\b/i.test(text)) {
      serviceCharge = classifiedAmount;
      continue;
    }
    if (/^(?:tip|discount|diskon|cash|tunai|qris|payment|pembayaran)\b/i.test(text)) {
      continue;
    }
    if (/[|\\:]\s*\d+\s*$/.test(text) && /^[A-Za-zÀ-ÿ]/.test(text)) {
      pendingNames.push({ ...row, text: cleanName(text) });
      continue;
    }

    const detail = text.match(
      new RegExp(`(${numericToken})\\s*[x×]\\s*(\\d+)\\s+(${numericToken})\\s*$`, "i"),
    );
    if (detail) {
      const scannedUnit = normalizeMoneyToken(detail[1], true);
      const quantity = Number(detail[2]);
      const total = normalizeMoneyToken(detail[3], true);
      if (scannedUnit !== undefined && total !== undefined) {
        const derived = total / quantity;
        const unitPrice =
          scannedUnit * quantity === total || !Number.isSafeInteger(derived)
            ? scannedUnit
            : derived;
        const name = pendingNames
          .slice(-2)
          .map((pending) => cleanName(pending.text))
          .filter(Boolean)
          .join(" ");
        const item = safeItem(name, quantity, unitPrice, row.confidence);
        if (item) addUnique(items, item);
      }
      pendingNames.length = 0;
      continue;
    }

    const aligned = text.match(
      new RegExp(`^(.+?)\\s+(\\d+)\\s+(${numericToken})\\s+(${numericToken})\\s*$`, "i"),
    );
    if (aligned) {
      const quantity = Number(aligned[2]);
      const unit = normalizeMoneyToken(aligned[3], true);
      const total = normalizeMoneyToken(aligned[4], true);
      if (unit !== undefined && total !== undefined) {
        const derived = total / quantity;
        const unitPrice = unit * quantity === total || !Number.isSafeInteger(derived) ? unit : derived;
        const item = safeItem(aligned[1], quantity, unitPrice, row.confidence);
        if (item) addUnique(items, item);
      }
      pendingNames.length = 0;
      continue;
    }

    const quantityFirst = text.match(
      new RegExp(`^(\\d+)\\s+(.+?)\\s+(${numericToken})\\s*$`, "i"),
    );
    const quantityLast = text.match(
      new RegExp(`^(.+?)\\s+(\\d+)\\s+(${numericToken})\\s*$`, "i"),
    );
    const simple = text.match(new RegExp(`^(.+?)\\s+(${numericToken})\\s*$`, "i"));
    if (quantityFirst || quantityLast || simple) {
      const name = quantityFirst?.[2] ?? quantityLast?.[1] ?? simple?.[1] ?? "";
      const quantity = Number(quantityFirst?.[1] ?? quantityLast?.[2] ?? 1);
      const priceToken = quantityFirst?.[3] ?? quantityLast?.[3] ?? simple?.[2] ?? "";
      const price = normalizeMoneyToken(priceToken, true);
      if (price !== undefined) {
        const item = safeItem(name, quantity, price, row.confidence);
        if (item) addUnique(items, item);
      }
      pendingNames.length = 0;
      continue;
    }

    if (/^[A-Za-zÀ-ÿ]/.test(text) && !ignoredItem.test(lower)) {
      pendingNames.push(row);
    }
  }

  if (items.length === 0) {
    const fallbackConfidence = Math.min(1, Math.max(0, candidate.engineConfidence / 100));
    for (const fallback of parseReceiptText(candidate.rawText)) {
      addUnique(items, {
        ...fallback,
        confidence: fallbackConfidence,
        source: fallback.estimated ? "estimated" : "ocr",
      });
    }
  }

  const confidence =
    items.length > 0
      ? items.reduce((sum, item) => sum + (item.confidence ?? 0), 0) / items.length
      : Math.min(1, Math.max(0, candidate.engineConfidence / 100));
  const issues: ReceiptIssue[] = [];
  if (confidence < 0.65) {
    issues.push({ code: "low-confidence", message: "Sebagian teks struk kurang jelas." });
  }
  if (subtotal === undefined) {
    issues.push({ code: "missing-subtotal", message: "Subtotal belum terbaca." });
  }

  return {
    items,
    subtotal,
    tax,
    serviceCharge,
    grandTotal,
    confidence,
    issues,
    sourceCandidateId: candidate.id,
  };
}
