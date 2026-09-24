"use client";
import { ArrowRight, ReceiptText, ScanLine, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type {
  AppSettings,
  GroupRecord,
  TaxCacheRecord,
  TransactionRecord,
} from "@/features/storage/models";
import {
  groupRepository,
  settingsRepository,
  taxRepository,
  transactionRepository,
} from "@/features/storage/repositories";
import { formatRupiah } from "@/lib/formatters";

export function Dashboard() {
  const [state, setState] = useState<{
    settings: AppSettings;
    groups: GroupRecord[];
    transactions: TransactionRecord[];
    taxes: TaxCacheRecord[];
  }>();
  useEffect(() => {
    void Promise.all([
      settingsRepository.get(),
      groupRepository.list(),
      transactionRepository.list(),
      taxRepository.list(),
    ]).then(([settings, groups, transactions, taxes]) =>
      setState({ settings, groups, transactions, taxes }),
    );
  }, []);
  if (!state) return <p role="status">Memuat dashboard…</p>;
  const month = new Date().toISOString().slice(0, 7);
  const monthlyRows = state.transactions.filter((row) =>
    row.createdAt.startsWith(month),
  );
  const monthly = monthlyRows.reduce((sum, row) => sum + row.grandTotal, 0);
  const tax = state.taxes.sort((a, b) =>
    b.effectiveDate.localeCompare(a.effectiveDate),
  )[0];
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-[var(--text-secondary)]">
          {new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(
            new Date(),
          )}
        </p>
        <h1 className="mt-1 text-3xl font-black">
          Selamat datang, {state.settings.profileName} 👋
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Semua urusan patunganmu tersusun rapi di sini.
        </p>
      </header>
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--brand-50)] via-[var(--surface-card)] to-[var(--brand-100)] p-6 shadow-[var(--shadow-card)] sm:p-9">
        <div className="grid items-center gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[var(--brand-500)]">
              100% lokal di perangkatmu
            </span>
            <h2 className="mt-4 text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-4xl">
              Split bill lebih adil, tanpa ribet.
            </h2>
            <p className="mt-3 max-w-xl text-[var(--text-secondary)]">
              Hitung, simpan, dan kelola tagihan bersama dari satu tempat.
            </p>
            <Link
              href="/split-bill"
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--brand-500)] px-5 font-black text-white"
            >
              Mulai Split Bill <ArrowRight size={18} />
            </Link>
          </div>
          <Image
            src="/assets/illustration-calculator.png"
            alt="Kalkulator pembagian tagihan"
            width={320}
            height={260}
            className="mx-auto hidden max-h-56 w-auto sm:block"
            priority
          />
        </div>
      </section>
      <section aria-label="Ringkasan" className="grid gap-4 md:grid-cols-3">
        <Summary
          label="Pengeluaran bulan ini"
          value={formatRupiah(monthly)}
          helper={`${monthlyRows.length} transaksi`}
        />
        <Summary
          label="Grup aktif"
          value={String(state.groups.length)}
          helper="Tersimpan lokal"
        />
        <Summary
          label="Pajak default"
          value={`${state.settings.defaultTaxBasisPoints / 100}%`}
          helper={
            tax
              ? `${tax.name}, berlaku ${new Date(tax.effectiveDate).toLocaleDateString("id-ID")}`
              : "Dapat diatur di Pengaturan"
          }
        />
      </section>
      <section>
        <h2 className="text-xl font-black">Aksi cepat</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Quick
            href="/split-bill"
            icon={<ReceiptText />}
            title="Split Bill"
            text="Bagi tagihan bersama"
          />
          <Quick
            href="/scan"
            icon={<ScanLine />}
            title="Scan Struk"
            text="Baca atau input item"
          />
          <Quick
            href="/groups"
            icon={<UsersRound />}
            title="Kelola Grup"
            text="Atur anggota rutin"
          />
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex justify-between">
            <h2 className="text-xl font-black">Grup kamu</h2>
            <Link
              href="/groups"
              className="text-sm font-bold text-[var(--brand-500)]"
            >
              Lihat semua
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {state.groups.length ? (
              state.groups.slice(0, 4).map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="flex min-h-14 items-center gap-3 rounded-xl bg-[var(--surface-muted)] p-3"
                >
                  <span className="text-2xl">{group.emoji}</span>
                  <span>
                    <strong className="block">{group.name}</strong>
                    <small>{group.memberIds.length} anggota</small>
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                Belum ada grup.{" "}
                <Link
                  href="/groups"
                  className="font-bold text-[var(--brand-500)]"
                >
                  Buat grup
                </Link>
              </p>
            )}
          </div>
        </section>
        <section className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex justify-between">
            <h2 className="text-xl font-black">Transaksi terbaru</h2>
            <Link
              href="/history"
              className="text-sm font-bold text-[var(--brand-500)]"
            >
              Lihat semua
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {state.transactions.length ? (
              state.transactions.slice(0, 5).map((row) => (
                <Link
                  key={row.id}
                  href={`/history/${row.id}`}
                  className="flex min-h-14 items-center justify-between rounded-xl border border-[var(--surface-border)] p-3"
                >
                  <span>
                    <strong className="block">{row.title}</strong>
                    <small>
                      {row.status === "completed" ? "Lunas" : "Belum lunas"}
                    </small>
                  </span>
                  <strong>{formatRupiah(row.grandTotal)}</strong>
                </Link>
              ))
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                Belum ada transaksi. Mulai dari Split Bill.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
function Summary({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{helper}</p>
    </div>
  );
}
function Quick({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-50)] text-[var(--brand-500)]">
        {icon}
      </span>
      <h3 className="mt-3 font-black">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)]">{text}</p>
    </Link>
  );
}
