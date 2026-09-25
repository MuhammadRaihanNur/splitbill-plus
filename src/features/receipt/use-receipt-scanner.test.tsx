import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdaptiveOcrResult } from "./ocr-orchestrator";
import type { ReceiptPolygon } from "./scan-types";
import { useReceiptScanner } from "./use-receipt-scanner";

const automatic: ReceiptPolygon = {
  topLeft: { x: 20, y: 20 },
  topRight: { x: 780, y: 20 },
  bottomRight: { x: 780, y: 1180 },
  bottomLeft: { x: 20, y: 1180 },
  confidence: 0.9,
  source: "automatic",
};

const completed: AdaptiveOcrResult = {
  best: {
    id: "best",
    rawText: "Nasi 20.000\nSubtotal 20.000",
    lines: [],
    engineConfidence: 95,
    orientation: 0,
    preprocessing: "grayscale",
    durationMs: 20,
  },
  interpreted: {
    items: [{ name: "Nasi", quantity: 1, unitPrice: 20_000 }],
    subtotal: 20_000,
    confidence: 0.95,
    issues: [],
    sourceCandidateId: "best",
  },
  alternatives: [],
};

describe("useReceiptScanner", () => {
  it("cancels safely, retries the edited polygon, and cleans preview resources", async () => {
    const close = vi.fn();
    const revokePreviewUrl = vi.fn();
    const correctedPolygons: ReceiptPolygon[] = [];
    let ocrCalls = 0;
    let firstSignal: AbortSignal | undefined;
    const dependencies = {
      createPreviewUrl: vi.fn(() => "blob:receipt"),
      revokePreviewUrl,
      load: vi.fn(async () => ({ width: 800, height: 1200, close })),
      detect: vi.fn(async () => automatic),
      correct: vi.fn(async (_source, polygon: ReceiptPolygon) => {
        correctedPolygons.push(polygon);
        return {
          canvas: document.createElement("canvas"),
          cleanup: vi.fn(),
        };
      }),
      runOcr: vi.fn(async (_input, callbacks) => {
        ocrCalls += 1;
        if (ocrCalls === 2) return completed;
        firstSignal = callbacks.signal;
        return new Promise<AdaptiveOcrResult>((_resolve, reject) => {
          callbacks.signal.addEventListener(
            "abort",
            () => reject(new DOMException("cancelled", "AbortError")),
            { once: true },
          );
        });
      }),
    };
    const { result, unmount } = renderHook(() =>
      useReceiptScanner(dependencies),
    );

    await act(async () => {
      await result.current.selectFile(
        new File(["image"], "receipt.jpg", { type: "image/jpeg" }),
      );
    });
    expect(result.current.status).toBe("editing");
    expect(result.current.previewUrl).toBe("blob:receipt");

    const edited = {
      ...automatic,
      topLeft: { x: 30, y: 40 },
      source: "manual" as const,
    };
    act(() => result.current.setPolygon(edited));
    act(() => void result.current.scan());
    await waitFor(() => expect(result.current.status).toBe("processing"));
    act(() => result.current.cancel());
    await waitFor(() => expect(result.current.status).toBe("editing"));
    expect(firstSignal?.aborted).toBe(true);
    expect(result.current.previewUrl).toBe("blob:receipt");

    await act(async () => {
      await result.current.scan();
    });
    expect(result.current.status).toBe("review");
    expect(correctedPolygons).toEqual([edited, edited]);

    unmount();
    expect(close).toHaveBeenCalledOnce();
    expect(revokePreviewUrl).toHaveBeenCalledOnce();
  });
});
