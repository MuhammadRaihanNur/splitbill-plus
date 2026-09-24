"use client";

import { NavLink } from "@/components/layout/nav-link";
import { navigationItems } from "@/lib/navigation";

export function MobileNavigation() {
  return (
    <nav
      aria-label="Navigasi mobile"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--surface-border)] bg-[var(--surface-card)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-12px_35px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {navigationItems
          .filter((item) => item.showOnMobile)
          .map((item) => (
            <NavLink key={item.id} item={item} mobile />
          ))}
      </div>
    </nav>
  );
}
