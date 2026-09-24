import type { ReactNode } from "react";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-[88px] lg:pl-[var(--sidebar-width)]">
        <Topbar />
        <main className="mx-auto max-w-[var(--content-max-width)] px-4 pb-28 pt-5 md:px-6 md:pb-10 md:pt-7 lg:px-8">
          {children}
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
