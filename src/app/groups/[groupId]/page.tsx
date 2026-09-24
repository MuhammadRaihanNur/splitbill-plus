import { AppShell } from "@/components/layout/app-shell";
import { GroupDetail } from "@/features/groups/components/group-detail";
export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return (
    <AppShell>
      <GroupDetail groupId={groupId} />
    </AppShell>
  );
}
