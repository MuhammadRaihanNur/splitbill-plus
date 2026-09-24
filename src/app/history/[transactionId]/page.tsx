import { AppShell } from "@/components/layout/app-shell";
import { TransactionDetail } from "@/features/history/components/transaction-detail";
export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = await params;
  return (
    <AppShell>
      <TransactionDetail transactionId={transactionId} />
    </AppShell>
  );
}
