"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isRouteActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { NavigationItem } from "@/types/navigation";

interface NavLinkProps {
  item: NavigationItem;
  mobile?: boolean;
}

export function NavLink({ item, mobile = false }: NavLinkProps) {
  const pathname = usePathname();
  const active = isRouteActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className={cn(
        "group flex min-h-11 items-center text-sm font-semibold transition duration-[var(--motion-fast)]",
        mobile
          ? "min-w-0 flex-1 flex-col justify-center gap-1 rounded-xl px-1 py-2 text-[10px]"
          : "gap-3 rounded-xl px-3.5 py-3 md:justify-center lg:justify-start",
        active
          ? "bg-[var(--brand-50)] text-[var(--brand-600)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "shrink-0",
          active && "drop-shadow-[0_3px_6px_rgba(22,119,255,0.2)]",
        )}
        size={mobile ? 20 : 20}
        strokeWidth={active ? 2.5 : 2}
      />
      <span className={mobile ? "truncate" : "md:sr-only lg:not-sr-only"}>
        {item.label}
      </span>
    </Link>
  );
}
