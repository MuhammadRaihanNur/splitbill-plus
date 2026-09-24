import { describe, expect, it } from "vitest";

import { isRouteActive, navigationItems } from "@/lib/navigation";

describe("navigation", () => {
  it("normalizes a trailing slash before matching a route", () => {
    expect(isRouteActive("/groups/", "/groups")).toBe(true);
    expect(isRouteActive("/history", "/groups")).toBe(false);
  });

  it("keeps the dashboard route from matching every page", () => {
    expect(isRouteActive("/", "/")).toBe(true);
    expect(isRouteActive("/split-bill", "/")).toBe(false);
  });

  it("exposes the product destinations from one route model", () => {
    expect(navigationItems.map((item) => item.label)).toEqual([
      "Beranda",
      "Split Bill",
      "Scan Struk",
      "Grup",
      "Riwayat",
      "Pengaturan",
    ]);
    expect(navigationItems.filter((item) => item.showOnMobile)).toHaveLength(5);
  });
});
