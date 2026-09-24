import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

describe("ConfirmDialog", () => {
  it("opens, closes on Escape, and confirms", async () => {
    const user = userEvent.setup();
    const confirm = vi.fn();
    render(
      <ConfirmDialog
        triggerLabel="Hapus"
        title="Hapus transaksi?"
        onConfirm={confirm}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Hapus" }));
    const dialog = screen.getByRole("dialog", { name: "Hapus transaksi?" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hapus" }));
    await user.click(screen.getByRole("button", { name: "Ya, hapus" }));
    expect(confirm).toHaveBeenCalledOnce();
  });
});
