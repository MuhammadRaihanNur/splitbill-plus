import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GroupsWorkspace } from "@/features/groups/components/groups-workspace";
import { ToastProvider } from "@/components/ui/toast-provider";
import { resetDatabase } from "@/test/reset-database";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
describe("GroupsWorkspace", () => {
  beforeEach(resetDatabase);
  it("creates a group and reusable members", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <GroupsWorkspace />
      </ToastProvider>,
    );
    await screen.findByRole("heading", { name: "Grup" });
    await user.click(screen.getByRole("button", { name: "Buat grup" }));
    await user.type(screen.getByLabelText("Nama grup"), "Anak Kantor");
    await user.type(screen.getByLabelText("Nama anggota baru"), "Andi");
    await user.click(screen.getByRole("button", { name: "Tambah anggota" }));
    await user.click(screen.getByRole("button", { name: "Simpan grup" }));
    expect(
      await screen.findByRole("heading", { name: "Anak Kantor" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 anggota")).toBeInTheDocument();
  });
});
