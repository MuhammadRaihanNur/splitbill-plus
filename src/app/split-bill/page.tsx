import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { SplitBillWorkspace } from "@/features/split-bill/components/split-bill-workspace";

export const metadata: Metadata = { title: "Split Bill" };

export default function SplitBillPage() {
  return (
    <AppShell>
      <SplitBillWorkspace />
    </AppShell>
  );
}
