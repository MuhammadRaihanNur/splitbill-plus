import { describe, expect, it, vi } from "vitest";

import type {
  InterpretedReceipt,
  OcrCandidate,
  RightAngle,
} from "./scan-types";
import { orientationOrder, runAdaptiveOcr } from "./ocr-orchestrator";

const source = { width: 800, height: 1200 } as CanvasImageSource & {
  width: number;
  height: number;
};

function resultFor(
  candidate: OcrCandidate,
  exact: boolean,
): InterpretedReceipt {
  return {
    items: [
      { name: "Nasi", quantity: 1, unitPrice: exact ? 214_000 : 197_000 },
    ],
    subtotal: 214_000,
    confidence: exact ? 0.94 : 0.72,
    issues: exact
      ? []
      : [{ code: "total-mismatch", message: "Selisih Rp17.000" }],
    sourceCandidateId: candidate.id,
  };
}

describe("adaptive OCR orchestration", () => {
  it("prioritizes a detected orientation before the remaining quarter turns", () => {
    expect(orientationOrder()).toEqual([0, 90, 180, 270]);
    expect(orientationOrder(90)).toEqual([90, 0, 180, 270]);
  });

  it("stops after the first exact high-confidence pass", async () => {
    const recognize = vi.fn(
      async (_image, pass: { orientation: RightAngle }) => ({
        id: `pass-${pass.orientation}`,
        rawText: "Nasi 214.000\nSubtotal 214.000",
        lines: [],
        engineConfidence: 95,
        orientation: pass.orientation,
        preprocessing: "grayscale" as const,
        durationMs: 20,
      }),
    );
    const terminate = vi.fn(async () => undefined);

    const output = await runAdaptiveOcr(
      {
        source,
        lowMemory: false,
        interpret: (candidate) => resultFor(candidate, true),
      },
      {
        signal: new AbortController().signal,
        createRecognizer: async () => ({ recognize, terminate }),
        render: async () => document.createElement("canvas"),
      },
    );

    expect(recognize).toHaveBeenCalledOnce();
    expect(output.best.orientation).toBe(0);
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("continues to the next orientation after a subtotal mismatch", async () => {
    const orientations: RightAngle[] = [];
    const recognize = vi.fn(
      async (_image, pass: { orientation: RightAngle }) => {
        orientations.push(pass.orientation);
        return {
          id: `pass-${pass.orientation}`,
          rawText: String(pass.orientation),
          lines: [],
          engineConfidence:
            pass.orientation === 90 || pass.orientation === 0 ? 95 : 78,
          orientation: pass.orientation,
          preprocessing: "grayscale" as const,
          durationMs: 20,
        };
      },
    );

    await runAdaptiveOcr(
      {
        source,
        preferredOrientation: 90,
        lowMemory: true,
        interpret: (candidate) =>
          resultFor(candidate, candidate.orientation === 0),
      },
      {
        signal: new AbortController().signal,
        createRecognizer: async () => ({
          recognize,
          terminate: vi.fn(async () => undefined),
        }),
        render: async () => document.createElement("canvas"),
      },
    );

    expect(orientations).toEqual([90, 0]);
  });

  it("cancels an active recognizer, terminates it, and starts no later pass", async () => {
    const controller = new AbortController();
    const recognize = vi.fn(() => new Promise<OcrCandidate>(() => undefined));
    const terminate = vi.fn(async () => undefined);
    const scan = runAdaptiveOcr(
      {
        source,
        lowMemory: true,
        interpret: (candidate) => resultFor(candidate, false),
      },
      {
        signal: controller.signal,
        createRecognizer: async () => ({ recognize, terminate }),
        render: async () => document.createElement("canvas"),
      },
    );
    await vi.waitFor(() => expect(recognize).toHaveBeenCalledOnce());
    controller.abort();

    await expect(scan).rejects.toMatchObject({ name: "AbortError" });
    expect(recognize).toHaveBeenCalledOnce();
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("uses at most two preprocessing modes per orientation on low memory", async () => {
    const passes: Array<{ orientation: RightAngle; preprocessing: string }> =
      [];
    await runAdaptiveOcr(
      {
        source,
        lowMemory: true,
        interpret: (candidate) => resultFor(candidate, false),
      },
      {
        signal: new AbortController().signal,
        createRecognizer: async () => ({
          recognize: async (_image, pass) => {
            passes.push(pass);
            return {
              id: `${pass.orientation}-${pass.preprocessing}`,
              rawText: `${pass.orientation}-${pass.preprocessing}`,
              lines: [],
              engineConfidence: 50,
              orientation: pass.orientation,
              preprocessing: pass.preprocessing,
              durationMs: 10,
            };
          },
          terminate: async () => undefined,
        }),
        render: async () => document.createElement("canvas"),
      },
    );

    for (const orientation of [0, 90, 180, 270] as const) {
      expect(
        passes.filter((pass) => pass.orientation === orientation),
      ).toHaveLength(2);
    }
  });
});
