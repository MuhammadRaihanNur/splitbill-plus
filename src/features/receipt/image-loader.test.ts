import { describe, expect, it, vi } from "vitest";

import { calculateWorkingSize, loadReceiptImage } from "./image-loader";

describe("receipt image loading", () => {
  it("caps large images to the device memory budget without changing ratio", () => {
    expect(calculateWorkingSize(6000, 8000, 2)).toEqual({
      width: 1500,
      height: 2000,
    });
    expect(calculateWorkingSize(1200, 1600, 8)).toEqual({
      width: 1200,
      height: 1600,
    });
  });

  it("releases a decoded bitmap when cancellation arrives after decode", async () => {
    const controller = new AbortController();
    const bitmap = {
      width: 1200,
      height: 1600,
      close: vi.fn(),
    } as unknown as ImageBitmap;
    const decode = vi.fn(async () => {
      controller.abort();
      return bitmap;
    });

    await expect(
      loadReceiptImage(
        new File(["receipt"], "receipt.jpg", { type: "image/jpeg" }),
        controller.signal,
        decode,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
