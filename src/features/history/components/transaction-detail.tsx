"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { TransactionAggregate } from "@/features/storage/models";
import { transactionRepository } from "@/features/storage/repositories";
import { formatRupiah } from "@/lib/formatters";
export function TransactionDetail({
  transactionId,
}: {
  transactionId: string;
}) {
  const [aggregate, setAggregate] = useState<TransactionAggregate | null>();
  useEffect(() => {
    void transactionRepository
      .getAggregate(transactionId)
      .then((value) => setAggregate(value ?? null));
  }, [transactionId]);
  if (aggregate === undefined) return <p role="status">Memuat transaksi…</p>;
  if (aggregate === null)
    return (
      <div>
        <h1 className="text-2xl font-black">Transaksi tidak ditemukan</h1>
        <Link href="/history" className="mt-4 inline-block underline">
          Kembali ke Riwayat
        </Link>
      </div>
    );
  const { transaction, items } = aggregate;
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold text-[var(--brand-500)]">
          Detail transaksi
        </p>
        <h1 className="text-3xl font-black">{transaction.title}</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          {new Date(transaction.createdAt).toLocaleString("id-ID")} ·{" "}
          {transaction.groupName ?? "Tanpa grup"}
        </p>
      </header>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-black">Rincian</h2>
          {[
            ["Subtotal", transaction.subtotal],
            ["Pajak", transaction.tax],
            ["Layanan", transaction.serviceCharge],
            ["Tip", transaction.tip],
          ].map(([label, value]) => (
            <div key={String(label)} className="mt-3 flex justify-between">
              <span>{label}</span>
              <strong>{formatRupiah(Number(value))}</strong>
            </div>
          ))}
          <div className="mt-4 flex justify-between border-t pt-4 text-xl">
            <span>Total</span>
            <strong>{formatRupiah(transaction.grandTotal)}</strong>
          </div>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-black">Pembagian</h2>
          {transaction.splits.map((split) => (
            <div
              key={split.participantId}
              className="mt-3 flex justify-between rounded-xl bg-[var(--surface-muted)] p-3"
            >
              <span>{split.participantName}</span>
              <strong>{formatRupiah(split.amount)}</strong>
            </div>
          ))}
        </div>
      </section>
      {items.length ? (
        <section className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-black">Item</h2>
          {items.map((item) => (
            <div key={item.id} className="mt-3 flex justify-between">
              <span>
                {item.quantity}× {item.name}
              </span>
              <strong>{formatRupiah(item.price * item.quantity)}</strong>
            </div>
          ))}
        </section>
      ) : null}
      <Link
        href="/history"
        className="inline-flex min-h-11 items-center rounded-xl border px-4 font-bold"
      >
        ← Kembali
      </Link>
    </div>
  );
}
