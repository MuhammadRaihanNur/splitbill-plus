import { describe, expect, it } from "vitest";
import { validateReceiptFile } from "@/features/receipt/file-validation";
const file = (name: string, type: string, size: number) =>
  new File([new Uint8Array(size)], name, { type });
describe("validateReceiptFile", () => {
  it("accepts images and rejects type or size violations", () => {
    expect(
      validateReceiptFile(file("receipt.webp", "image/webp", 1000)),
    ).toEqual({ ok: true });
    expect(
      validateReceiptFile(file("receipt.pdf", "application/pdf", 1000)),
    ).toMatchObject({ ok: false, code: "unsupported_type" });
    expect(
      validateReceiptFile(
        file("large.jpg", "image/jpeg", 10 * 1024 * 1024 + 1),
      ),
    ).toMatchObject({ ok: false, code: "too_large" });
  });
});
