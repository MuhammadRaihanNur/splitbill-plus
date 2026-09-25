import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReceiptProgress } from "./receipt-progress";

describe("ReceiptProgress", () => {
  it("shows stable stage, pass, elapsed time, and a working cancel action", () => {
    const onCancel = vi.fn();
    render(
      <ReceiptProgress
        progress={{
          stage: "recognizing-text",
          progress: 0.42,
          pass: 2,
          totalPasses: 8,
          elapsedMs: 12_400,
        }}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Membaca teks struk")).toBeVisible();
    expect(screen.getByText("Pass 2 dari 8")).toBeVisible();
    expect(screen.getByText("12 detik")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Batalkan scan" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
