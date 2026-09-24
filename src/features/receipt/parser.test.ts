import { describe, expect, it } from "vitest";
import { parseReceiptText } from "@/features/receipt/parser";
describe("parseReceiptText", () => {
  it("extracts conservative quantity name and price rows", () => {
    expect(parseReceiptText("2 Nasi Goreng 45.000\n1 Es Teh 8.000")).toEqual([
      { name: "Nasi Goreng", quantity: 2, unitPrice: 45000 },
      { name: "Es Teh", quantity: 1, unitPrice: 8000 },
    ]);
  });

  it("extracts multiline items from the real receipt OCR output", () => {
    const ocrText = `
Pain Au Choco
DOUBLE CHOCO
17.000 x3 51.000
Salt Bread
KUNAFA PISTACHIO
18.000 x2 36. 000
Burnt Cheese Cup
BESAR
19.000 x1 19.000
Premium Matcha
ICE LARGE
17.000 x1 17.000
Croffee
ICE LARGE
17. 000 x1 17.000
Ceremonial Matcha | 5
LARGE
21.000 x2 42,000
Coffee Latte
ICE REGULAR
\\ 16.000 x1 15.000
Coffee Latte
ICE LARGE
Subtotal 214.000
Grand Total Rp 214.000
QRIS Rp 214.000`;

    expect(parseReceiptText(ocrText)).toEqual([
      {
        name: "Pain Au Choco DOUBLE CHOCO",
        quantity: 3,
        unitPrice: 17000,
      },
      {
        name: "Salt Bread KUNAFA PISTACHIO",
        quantity: 2,
        unitPrice: 18000,
      },
      { name: "Burnt Cheese Cup BESAR", quantity: 1, unitPrice: 19000 },
      { name: "Premium Matcha ICE LARGE", quantity: 1, unitPrice: 17000 },
      { name: "Croffee ICE LARGE", quantity: 1, unitPrice: 17000 },
      {
        name: "Ceremonial Matcha LARGE",
        quantity: 2,
        unitPrice: 21000,
      },
      { name: "Coffee Latte ICE REGULAR", quantity: 1, unitPrice: 15000 },
      {
        name: "Coffee Latte ICE LARGE",
        quantity: 1,
        unitPrice: 17000,
        estimated: true,
      },
    ]);
  });
});
