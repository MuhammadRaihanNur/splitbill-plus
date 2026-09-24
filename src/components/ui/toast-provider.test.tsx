import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "@/components/ui/toast-provider";

function Trigger() {
  const toast = useToast();
  return (
    <button onClick={() => toast.success("Transaksi tersimpan")}>Simpan</button>
  );
}
describe("ToastProvider", () => {
  it("announces feedback", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    expect(screen.getByRole("status")).toHaveTextContent("Transaksi tersimpan");
  });
});
