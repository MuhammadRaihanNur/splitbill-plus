import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/toast-provider";
import { draftRepository } from "@/features/storage/repositories";
import { resetDatabase } from "@/test/reset-database";
import type { AdaptiveOcrResult } from "../ocr-orchestrator";
import type { ReceiptScannerDependencies } from "../use-receipt-scanner";
import { ReceiptWorkspace } from "./receipt-workspace";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const prices = [25_000, 30_000, 18_000, 22_000, 35_000, 28_000, 26_000, 30_000];
const primaryItems = prices.map((unitPrice, index) => ({
  name: `Item ${index + 1}`,
  quantity: 1,
  unitPrice,
  confidence: index === 0 ? 0.48 : index === 7 ? 0.45 : 0.92,
  source: index === 7 ? ("estimated" as const) : ("ocr" as const),
  estimated: index === 7 || undefined,
}));

const result: AdaptiveOcrResult = {
  best: {
    id: "primary",
    rawText: "primary",
    lines: [],
    engineConfidence: 92,
    orientation: 0,
    preprocessing: "grayscale",
    durationMs: 20,
  },
  interpreted: {
    items: primaryItems,
    subtotal: 214_000,
    confidence: 0.84,
    issues: [],
    sourceCandidateId: "primary",
  },
  alternatives: [
    {
      candidate: {
        id: "primary",
        rawText: "primary",
        lines: [],
        engineConfidence: 92,
        orientation: 0,
        preprocessing: "grayscale",
        durationMs: 20,
      },
      interpreted: {
        items: primaryItems,
        subtotal: 214_000,
        confidence: 0.84,
        issues: [],
        sourceCandidateId: "primary",
      },
      score: 0.9,
    },
    {
      candidate: {
        id: "alternate",
        rawText: "alternate",
        lines: [],
        engineConfidence: 78,
        orientation: 90,
        preprocessing: "contrast",
        durationMs: 30,
      },
      interpreted: {
        items: [{ name: "Alternatif Kopi", quantity: 1, unitPrice: 20_000 }],
        subtotal: 20_000,
        confidence: 0.7,
        issues: [],
        sourceCandidateId: "alternate",
      },
      score: 0.7,
    },
  ],
};

describe("ReceiptWorkspace", () => {
  beforeEach(async () => {
    await resetDatabase();
    push.mockReset();
  });

  it("reviews alternatives and persists only selected valid rows", async () => {
    const user = userEvent.setup();
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1200;
    const dependencies: ReceiptScannerDependencies = {
      createPreviewUrl: () => "/receipt.jpg",
      revokePreviewUrl: vi.fn(),
      load: async () => canvas,
      detect: async () => ({
        topLeft: { x: 0, y: 0 },
        topRight: { x: 800, y: 0 },
        bottomRight: { x: 800, y: 1200 },
        bottomLeft: { x: 0, y: 1200 },
        confidence: 0.9,
        source: "automatic",
      }),
      correct: async () => ({ canvas, cleanup: vi.fn() }),
      runOcr: async () => result,
    };

    render(
      <ToastProvider>
        <ReceiptWorkspace scannerDependencies={dependencies} />
      </ToastProvider>,
    );
    await user.upload(
      screen.getByLabelText("Pilih foto struk"),
      new File(["image"], "receipt.jpg", { type: "image/jpeg" }),
    );
    await user.click(await screen.findByRole("button", { name: "Scan" }));

    expect(await screen.findByText("Subtotal struk")).toBeVisible();
    expect(screen.getByText("Total item")).toBeVisible();
    expect(screen.getByText("Selisih")).toBeVisible();
    expect(screen.getByText("Rp 0")).toBeVisible();
    expect(screen.getAllByLabelText("Nama item struk")).toHaveLength(8);
    expect(screen.getByText("Estimasi — mohon periksa")).toBeVisible();
    expect(screen.getByText("Keyakinan rendah — mohon periksa")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Hasil 2" }));
    expect(screen.getByDisplayValue("Alternatif Kopi")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Hasil 1" }));
    await user.click(screen.getByLabelText("Pilih Item 1"));
    await user.click(screen.getByRole("button", { name: "Lanjut ke Split per Item" }));

    await waitFor(async () => {
      expect((await draftRepository.get())?.items).toHaveLength(7);
    });
    expect(push).toHaveBeenCalledWith("/split-bill");
  });
});
