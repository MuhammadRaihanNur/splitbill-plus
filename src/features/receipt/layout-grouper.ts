import type { OcrLine } from "./scan-types";

export interface LayoutRow {
  words: Array<OcrLine & { bbox: NonNullable<OcrLine["bbox"]> }>;
  text: string;
  confidence: number;
  bbox: NonNullable<OcrLine["bbox"]>;
}

type BoxedWord = OcrLine & { bbox: NonNullable<OcrLine["bbox"]> };

function overlapsVertically(first: BoxedWord, second: BoxedWord): boolean {
  const overlap = Math.max(
    0,
    Math.min(first.bbox.y1, second.bbox.y1) -
      Math.max(first.bbox.y0, second.bbox.y0),
  );
  const smallerHeight = Math.min(
    first.bbox.y1 - first.bbox.y0,
    second.bbox.y1 - second.bbox.y0,
  );
  return smallerHeight > 0 && overlap / smallerHeight >= 0.5;
}

function buildRow(words: BoxedWord[]): LayoutRow {
  const sorted = [...words].sort(
    (first, second) => first.bbox.x0 - second.bbox.x0,
  );
  return {
    words: sorted,
    text: sorted
      .map((word) => word.text.trim())
      .filter(Boolean)
      .join(" "),
    confidence: Math.min(...sorted.map((word) => word.confidence)),
    bbox: {
      x0: Math.min(...sorted.map((word) => word.bbox.x0)),
      y0: Math.min(...sorted.map((word) => word.bbox.y0)),
      x1: Math.max(...sorted.map((word) => word.bbox.x1)),
      y1: Math.max(...sorted.map((word) => word.bbox.y1)),
    },
  };
}

export function groupWordsIntoRows(words: OcrLine[]): LayoutRow[] {
  const boxed = words.filter((word): word is BoxedWord => Boolean(word.bbox));
  const groups: BoxedWord[][] = [];
  for (const word of [...boxed].sort((a, b) => a.bbox.y0 - b.bbox.y0)) {
    const group = groups.find((candidate) =>
      candidate.some((existing) => overlapsVertically(existing, word)),
    );
    if (group) group.push(word);
    else groups.push([word]);
  }
  return groups
    .map(buildRow)
    .sort((first, second) => first.bbox.y0 - second.bbox.y0);
}
