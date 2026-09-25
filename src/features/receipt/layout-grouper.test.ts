import { describe, expect, it } from "vitest";

import { groupWordsIntoRows } from "./layout-grouper";

describe("groupWordsIntoRows", () => {
  it("restores item columns when OCR words arrive out of order", () => {
    const rows = groupWordsIntoRows([
      { text: "45.000", confidence: 0.9, bbox: { x0: 600, y0: 100, x1: 700, y1: 130 } },
      { text: "2", confidence: 0.95, bbox: { x0: 350, y0: 102, x1: 370, y1: 132 } },
      { text: "90.000", confidence: 0.91, bbox: { x0: 820, y0: 101, x1: 930, y1: 131 } },
      { text: "Nasi Goreng", confidence: 0.93, bbox: { x0: 80, y0: 98, x1: 270, y1: 132 } },
      { text: "Es Teh", confidence: 0.9, bbox: { x0: 80, y0: 160, x1: 180, y1: 190 } },
      { text: "8.000", confidence: 0.9, bbox: { x0: 820, y0: 160, x1: 920, y1: 190 } },
    ]);

    expect(rows.map((row) => row.text)).toEqual([
      "Nasi Goreng 2 45.000 90.000",
      "Es Teh 8.000",
    ]);
  });
});
