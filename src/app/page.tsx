import { AppShell } from "@/components/layout/app-shell";
import { Dashboard } from "@/features/dashboard/components/dashboard";

export default function HomePage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}
