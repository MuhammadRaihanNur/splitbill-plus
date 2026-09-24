import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryWorkspace } from "@/features/history/components/history-workspace";
import { ToastProvider } from "@/components/ui/toast-provider";
import { resetDatabase } from "@/test/reset-database";
import { transactionRepository } from "@/features/storage/repositories";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
describe("HistoryWorkspace", () => {
  beforeEach(resetDatabase);
  it("filters the visible history by start date", async () => {
    const base = {
      category: "food" as const,
      participants: [],
      subtotal: 1000,
      tax: 0,
      serviceCharge: 0,
      tip: 0,
      grandTotal: 1000,
      splitMode: "equal" as const,
      splits: [],
      status: "completed" as const,
      updatedAt: "2026-09-24T00:00:00.000Z",
    };
    await transactionRepository.saveAggregate(
      {
        ...base,
        id: "old",
        title: "Transaksi Lama",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      [],
    );
    await transactionRepository.saveAggregate(
      {
        ...base,
        id: "new",
        title: "Transaksi Baru",
        createdAt: "2026-09-24T00:00:00.000Z",
      },
      [],
    );
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <HistoryWorkspace />
      </ToastProvider>,
    );
    expect(await screen.findByText("Transaksi Lama")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Dari tanggal"), "2026-01-01");
    expect(screen.queryByText("Transaksi Lama")).not.toBeInTheDocument();
    expect(screen.getByText("Transaksi Baru")).toBeInTheDocument();
  });
});
