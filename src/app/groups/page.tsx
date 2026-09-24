import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { GroupsWorkspace } from "@/features/groups/components/groups-workspace";

export const metadata: Metadata = { title: "Grup" };

export default function GroupsPage() {
  return (
    <AppShell>
      <GroupsWorkspace />
    </AppShell>
  );
}
