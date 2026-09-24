import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";

describe("feedback states", () => {
  it("explains an empty transaction state with meaningful artwork", () => {
    render(<EmptyState />);

    expect(
      screen.getByRole("heading", { name: "Belum ada transaksi" }),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText("Dompet kosong tanpa transaksi"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Buat transaksi" }),
    ).toHaveAttribute("href", "/split-bill");
  });

  it("offers a recovery action when content cannot be shown", () => {
    render(<ErrorState />);

    expect(
      screen.getByRole("heading", { name: "Konten belum bisa dimuat" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Coba lagi" }),
    ).toBeInTheDocument();
  });
});
