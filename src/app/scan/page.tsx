import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { ReceiptWorkspace } from "@/features/receipt/components/receipt-workspace";

export const metadata: Metadata = { title: "Scan Struk" };

export default function ScanPage() {
  return (
    <AppShell>
      <ReceiptWorkspace />
    </AppShell>
  );
}
