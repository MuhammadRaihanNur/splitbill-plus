import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SplitBillWorkspace } from "@/features/split-bill/components/split-bill-workspace";
import { resetDatabase } from "@/test/reset-database";
import {
  draftRepository,
  transactionRepository,
} from "@/features/storage/repositories";
import { ToastProvider } from "@/components/ui/toast-provider";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
describe("SplitBillWorkspace", () => {
  beforeEach(resetDatabase);
  it("calculates and saves an equal transaction to history", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <SplitBillWorkspace />
      </ToastProvider>,
    );
    await screen.findByRole("heading", { name: "Split Bill" });
    await user.type(screen.getByLabelText("Judul tagihan"), "Makan siang");
    await user.type(screen.getByLabelText("Total tagihan"), "550000");
    await user.type(screen.getByLabelText("Nama peserta baru"), "Andi");
    await user.click(screen.getByRole("button", { name: "Tambah peserta" }));
    await user.type(screen.getByLabelText("Nama peserta baru"), "Siti");
    await user.click(screen.getByRole("button", { name: "Tambah peserta" }));
    expect(await screen.findAllByText("Rp 305.250")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Simpan transaksi" }));
    await waitFor(async () =>
      expect(await transactionRepository.list()).toHaveLength(1),
    );
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    });
    expect(await draftRepository.get()).toBeUndefined();
  });
});
