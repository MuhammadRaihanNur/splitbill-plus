"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  draftRepository,
  groupRepository,
  participantRepository,
  settingsRepository,
  transactionRepository,
} from "@/features/storage/repositories";
import type {
  GroupRecord,
  ParticipantRecord,
  TransactionRecord,
} from "@/features/storage/models";
import { formatRupiah } from "@/lib/formatters";

export function GroupDetail({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupRecord>();
  const [people, setPeople] = useState<ParticipantRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void (async () => {
      const [found, allPeople, records] = await Promise.all([
        groupRepository.get(groupId),
        participantRepository.list(),
        transactionRepository.listByGroup(groupId),
      ]);
      setGroup(found);
      setPeople(allPeople.filter((x) => found?.memberIds.includes(x.id)));
      setTransactions(records);
      setLoaded(true);
    })();
  }, [groupId]);
  async function start() {
    if (!group) return;
    const settings = await settingsRepository.get();
    await draftRepository.save({
      id: "active-split",
      title: "",
      mode: "equal",
      subtotal: 0,
      taxBasisPoints: settings.defaultTaxBasisPoints,
      serviceBasisPoints: settings.defaultServiceBasisPoints,
      tip: 0,
      status: "completed",
      participantIds: people.map((x) => x.id),
      customAmounts: {},
      items: [],
      groupId: group.id,
      updatedAt: new Date().toISOString(),
    });
    router.push("/split-bill");
  }
  if (!loaded) return <p role="status">Memuat grup…</p>;
  if (!group)
    return (
      <div>
        <h1 className="text-2xl font-black">Grup tidak ditemukan</h1>
        <button
          onClick={() => router.push("/groups")}
          className="mt-4 underline"
        >
          Kembali ke Grup
        </button>
      </div>
    );
  const total = transactions.reduce((sum, row) => sum + row.grandTotal, 0);
  return (
    <div className="space-y-6">
      <header className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-card)]">
        <p className="text-4xl">{group.emoji}</p>
        <h1 className="mt-2 text-3xl font-black">{group.name}</h1>
        <p className="text-[var(--text-secondary)]">{group.description}</p>
        <button
          type="button"
          onClick={() => void start()}
          className="mt-5 min-h-12 rounded-xl bg-[var(--brand-500)] px-5 font-black text-white"
        >
          Mulai Split Bill
        </button>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Anggota" value={String(people.length)} />
        <Metric label="Transaksi" value={String(transactions.length)} />
        <Metric
          label="Belum lunas"
          value={String(
            transactions.filter((row) => row.status === "pending").length,
          )}
        />
        <Metric label="Total patungan" value={formatRupiah(total)} />
      </div>
      <section className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-xl font-black">Anggota</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {people.map((person) => (
            <span
              key={person.id}
              className="rounded-full bg-[var(--brand-50)] px-3 py-2 font-bold"
            >
              {person.name}
            </span>
          ))}
        </div>
        <h2 className="mt-6 text-xl font-black">Transaksi terbaru</h2>
        <div className="mt-3 space-y-2">
          {transactions.length ? (
            transactions.slice(0, 5).map((row) => (
              <button
                key={row.id}
                onClick={() => router.push(`/history/${row.id}`)}
                className="flex min-h-12 w-full justify-between rounded-xl border p-3 text-left"
              >
                <span>{row.title}</span>
                <strong>{formatRupiah(row.grandTotal)}</strong>
              </button>
            ))
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              Belum ada transaksi untuk grup ini.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}
