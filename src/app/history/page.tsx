import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { HistoryWorkspace } from "@/features/history/components/history-workspace";

export const metadata: Metadata = { title: "Riwayat" };

export default function HistoryPage() {
  return (
    <AppShell>
      <HistoryWorkspace />
    </AppShell>
  );
}
