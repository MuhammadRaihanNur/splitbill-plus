import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSearch } from "@/features/search/components/global-search";
import { groupRepository } from "@/features/storage/repositories";
import { resetDatabase } from "@/test/reset-database";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
describe("GlobalSearch", () => {
  beforeEach(resetDatabase);
  it("finds real menu and group destinations", async () => {
    await groupRepository.create({
      name: "Anak Kantor",
      description: "",
      emoji: "💼",
      memberIds: [],
    });
    const user = userEvent.setup();
    render(<GlobalSearch />);
    await user.type(
      screen.getByRole("searchbox", {
        name: "Cari transaksi, grup, atau menu",
      }),
      "kantor",
    );
    expect(
      await screen.findByRole("link", { name: /anak kantor/i }),
    ).toHaveAttribute("href", expect.stringMatching(/^\/groups\//));
  });
});
