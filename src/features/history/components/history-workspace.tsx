"use client";
import { Download, Eye, Files, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast-provider";
import { summarizeTransactions } from "@/features/history/analytics";
import { downloadCsv } from "@/features/history/csv";
import { filterTransactions } from "@/features/history/filters";
import type { HistoryFilters } from "@/features/history/types";
import type { GroupRecord, TransactionRecord } from "@/features/storage/models";
import {
  draftRepository,
  groupRepository,
  transactionRepository,
} from "@/features/storage/repositories";
import { formatRupiah } from "@/lib/formatters";

const initial: HistoryFilters = {
  query: "",
  category: "all",
  status: "all",
  groupId: "all",
  dateFrom: "",
  dateTo: "",
};
export function HistoryWorkspace() {
  const toast = useToast();
  const router = useRouter();
  const [rows, setRows] = useState<TransactionRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [filters, setFilters] = useState<HistoryFilters>(() => ({
    ...initial,
    query:
      typeof window === "undefined"
        ? ""
        : (new URLSearchParams(window.location.search).get("q") ?? ""),
  }));
  const reload = async () => {
    const [transactions, groupRows] = await Promise.all([
      transactionRepository.list(),
      groupRepository.list(),
    ]);
    setRows(transactions);
    setGroups(groupRows);
  };
  useEffect(() => {
    void Promise.all([
      transactionRepository.list(),
      groupRepository.list(),
    ]).then(([transactions, groupRows]) => {
      setRows(transactions);
      setGroups(groupRows);
    });
  }, []);
  const filtered = useMemo(
    () => filterTransactions(rows, filters),
    [rows, filters],
  );
  const summary = useMemo(() => summarizeTransactions(filtered), [filtered]);
  async function duplicate(row: TransactionRecord) {
    const aggregate = await transactionRepository.getAggregate(row.id);
    await draftRepository.save({
      id: "active-split",
      title: `${row.title} (salinan)`,
      mode: row.splitMode,
      subtotal: row.subtotal,
      taxBasisPoints: row.subtotal
        ? Math.round((row.tax / row.subtotal) * 10000)
        : 0,
      serviceBasisPoints: row.subtotal
        ? Math.round((row.serviceCharge / row.subtotal) * 10000)
        : 0,
      tip: row.tip,
      status: "pending",
      participantIds: row.participants.map((x) => x.id),
      customAmounts: Object.fromEntries(
        row.splits.map((x) => [x.participantId, x.amount]),
      ),
      items: (aggregate?.items ?? []).map((x) => ({
        id: crypto.randomUUID(),
        name: x.name,
        price: x.price,
        quantity: x.quantity,
        ownerIds: x.ownerIds,
      })),
      groupId: row.groupId,
      updatedAt: new Date().toISOString(),
    });
    router.push("/split-bill");
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--brand-500)]">
            Semua transaksi
          </p>
          <h1 className="text-3xl font-black">Riwayat</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Cari, analisis, duplikasi, atau ekspor transaksi lokalmu.
          </p>
        </div>
        <button
          type="button"
          disabled={!filtered.length}
          onClick={() => downloadCsv(filtered)}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--brand-500)] px-5 font-black text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] disabled:opacity-50"
        >
          <Download size={18} /> Ekspor CSV
        </button>
      </header>
      <section className="grid gap-3 rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)] md:grid-cols-3 xl:grid-cols-6">
        <label className="relative md:col-span-2">
          <span className="sr-only">Cari riwayat</span>
          <Search className="absolute left-3 top-3.5" size={17} />
          <input
            aria-label="Cari riwayat"
            className={`${inputClass} pl-9`}
            value={filters.query}
            onChange={(e) =>
              setFilters((x) => ({ ...x, query: e.target.value }))
            }
          />
        </label>
        <select
          aria-label="Kategori"
          className={inputClass}
          value={filters.category}
          onChange={(e) =>
            setFilters((x) => ({
              ...x,
              category: e.target.value as HistoryFilters["category"],
            }))
          }
        >
          <option value="all">Semua kategori</option>
          <option value="food">Makanan</option>
          <option value="transport">Transportasi</option>
          <option value="shopping">Belanja</option>
          <option value="entertainment">Hiburan</option>
          <option value="other">Lainnya</option>
        </select>
        <select
          aria-label="Status"
          className={inputClass}
          value={filters.status}
          onChange={(e) =>
            setFilters((x) => ({
              ...x,
              status: e.target.value as HistoryFilters["status"],
            }))
          }
        >
          <option value="all">Semua status</option>
          <option value="completed">Lunas</option>
          <option value="pending">Belum lunas</option>
        </select>
        <select
          aria-label="Grup"
          className={inputClass}
          value={filters.groupId}
          onChange={(e) =>
            setFilters((x) => ({ ...x, groupId: e.target.value }))
          }
        >
          <option value="all">Semua grup</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
          {[
            ...new Set(
              rows
                .filter(
                  (x) => x.groupName && !groups.some((g) => g.id === x.groupId),
                )
                .map((x) => x.groupName!),
            ),
          ].map((name) => (
            <option key={name} value={name}>
              {name} (arsip)
            </option>
          ))}
        </select>
        <label className="text-xs font-bold text-[var(--text-secondary)]">
          Dari tanggal
          <input
            aria-label="Dari tanggal"
            type="date"
            className={`${inputClass} mt-1`}
            value={filters.dateFrom}
            onChange={(e) =>
              setFilters((x) => ({ ...x, dateFrom: e.target.value }))
            }
          />
        </label>
        <label className="text-xs font-bold text-[var(--text-secondary)]">
          Sampai tanggal
          <input
            aria-label="Sampai tanggal"
            type="date"
            className={`${inputClass} mt-1`}
            value={filters.dateTo}
            onChange={(e) =>
              setFilters((x) => ({ ...x, dateTo: e.target.value }))
            }
          />
        </label>
        <button
          type="button"
          onClick={() => setFilters(initial)}
          className="min-h-11 rounded-xl border font-bold"
        >
          Reset filter
        </button>
      </section>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Total" value={formatRupiah(summary.total)} />
        <Metric label="Transaksi" value={String(summary.count)} />
        <Metric label="Rata-rata" value={formatRupiah(summary.average)} />
      </div>
      {filtered.length ? (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="h-64 rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)]">
              <h2 className="font-black">Pengeluaran per bulan</h2>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={summary.byPeriod}>
                  <XAxis dataKey="name" />
                  <YAxis hide />
                  <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                  <Line dataKey="value" stroke="#1668e8" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64 rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)]">
              <h2 className="font-black">Per kategori</h2>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={summary.byCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                  >
                    {summary.byCategory.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={
                          [
                            "#1668e8",
                            "#12a66a",
                            "#f5a623",
                            "#e5484d",
                            "#687a96",
                          ][index % 5]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
            <div className="divide-y divide-[var(--surface-border)]">
              {filtered.map((row) => (
                <article
                  key={row.id}
                  className="flex flex-col gap-3 p-4 md:flex-row md:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-black">{row.title}</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {new Date(row.createdAt).toLocaleDateString("id-ID")} ·{" "}
                      {row.groupName ?? "Tanpa grup"} ·{" "}
                      {row.status === "completed" ? "Lunas" : "Belum lunas"}
                    </p>
                  </div>
                  <strong>{formatRupiah(row.grandTotal)}</strong>
                  <div className="flex gap-2">
                    <Link
                      aria-label={`Lihat ${row.title}`}
                      href={`/history/${row.id}`}
                      className="grid h-11 w-11 place-items-center rounded-xl border"
                    >
                      <Eye size={18} />
                    </Link>
                    <button
                      aria-label={`Duplikasi ${row.title}`}
                      onClick={() => void duplicate(row)}
                      className="grid h-11 w-11 place-items-center rounded-xl border"
                    >
                      <Files size={18} />
                    </button>
                    <ConfirmDialog
                      triggerLabel="Hapus"
                      title="Hapus transaksi?"
                      onConfirm={async () => {
                        await transactionRepository.remove(row.id);
                        await reload();
                        toast.success("Transaksi dihapus");
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-10 text-center shadow-[var(--shadow-card)]">
          <Trash2 className="mx-auto text-[var(--text-secondary)]" />
          <h2 className="mt-3 text-xl font-black">Tidak ada transaksi</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Ubah filter atau simpan transaksi dari Split Bill.
          </p>
        </div>
      )}
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
