import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";

const usePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
  useRouter: () => ({ push: vi.fn() }),
}));

describe("AppShell", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
  });

  it("provides desktop and mobile navigation with the current page announced", () => {
    render(<AppShell>Isi dashboard</AppShell>);

    expect(
      screen.getByRole("navigation", { name: "Navigasi utama" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Navigasi mobile" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Beranda" })[0]).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Isi dashboard")).toBeInTheDocument();
  });

  it("offers labelled search and a real profile control without paid or inert controls", () => {
    render(<AppShell>Isi dashboard</AppShell>);

    expect(
      screen.getByRole("searchbox", {
        name: "Cari transaksi, grup, atau menu",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Notifikasi" }),
    ).not.toBeInTheDocument();
    const paidWords = new RegExp(
      ["prem", "ium", "|", "up", "grade"].join(""),
      "i",
    );
    expect(screen.queryByText(paidWords)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Buka pengaturan profil" }),
    ).toHaveAttribute("href", "/settings");
  });
});
