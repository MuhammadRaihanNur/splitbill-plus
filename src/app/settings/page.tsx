import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { SettingsWorkspace } from "@/features/settings/components/settings-workspace";

export const metadata: Metadata = { title: "Pengaturan" };

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsWorkspace />
    </AppShell>
  );
}
