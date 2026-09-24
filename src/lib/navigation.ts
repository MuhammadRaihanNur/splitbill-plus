import {
  Clock3,
  House,
  ReceiptText,
  ScanLine,
  Settings,
  UsersRound,
} from "lucide-react";

import type { NavigationItem } from "@/types/navigation";

export const navigationItems: NavigationItem[] = [
  { id: "home", label: "Beranda", href: "/", icon: House, showOnMobile: true },
  {
    id: "split-bill",
    label: "Split Bill",
    href: "/split-bill",
    icon: ReceiptText,
    showOnMobile: true,
  },
  {
    id: "scan",
    label: "Scan Struk",
    href: "/scan",
    icon: ScanLine,
    showOnMobile: true,
  },
  {
    id: "groups",
    label: "Grup",
    href: "/groups",
    icon: UsersRound,
    showOnMobile: true,
  },
  {
    id: "history",
    label: "Riwayat",
    href: "/history",
    icon: Clock3,
    showOnMobile: true,
  },
  {
    id: "settings",
    label: "Pengaturan",
    href: "/settings",
    icon: Settings,
    showOnMobile: false,
  },
];

export function isRouteActive(pathname: string, href: string): boolean {
  const normalizedPath =
    pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  return href === "/"
    ? normalizedPath === "/"
    : normalizedPath === href || normalizedPath.startsWith(`${href}/`);
}
