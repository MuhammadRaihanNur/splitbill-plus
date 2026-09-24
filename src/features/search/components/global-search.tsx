"use client";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { navigationItems } from "@/lib/navigation";
import type { GroupRecord, TransactionRecord } from "@/features/storage/models";
import {
  groupRepository,
  transactionRepository,
} from "@/features/storage/repositories";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const normalized = query.trim().toLocaleLowerCase("id");
  useEffect(() => {
    if (normalized.length < 2) return;
    void Promise.all([
      groupRepository.list(),
      transactionRepository.list(),
    ]).then(([groupRows, transactionRows]) => {
      setGroups(
        groupRows
          .filter((x) => x.name.toLocaleLowerCase("id").includes(normalized))
          .slice(0, 4),
      );
      setTransactions(
        transactionRows
          .filter((x) =>
            `${x.title} ${x.groupName ?? ""}`
              .toLocaleLowerCase("id")
              .includes(normalized),
          )
          .slice(0, 5),
      );
    });
  }, [normalized]);
  const menus =
    normalized.length >= 2
      ? navigationItems.filter((x) =>
          x.label.toLocaleLowerCase("id").includes(normalized),
        )
      : [];
  const visible = normalized.length >= 2;
  return (
    <div className="relative w-full max-w-[480px]">
      <label>
        <span className="sr-only">Cari transaksi, grup, atau menu</span>
        <Search
          aria-hidden="true"
          size={19}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
        />
        <input
          type="search"
          aria-label="Cari transaksi, grup, atau menu"
          placeholder="Cari transaksi, grup, atau menu..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          className="h-11 w-full rounded-2xl border border-transparent bg-[var(--surface-card)] pl-11 pr-4 text-sm shadow-sm outline-none focus:border-[var(--brand-100)]"
        />
      </label>
      {visible ? (
        <div className="absolute inset-x-0 top-12 z-50 max-h-96 overflow-auto rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-2 shadow-2xl">
          {menus.length ? (
            <ResultGroup title="Menu">
              {menus.map((item) => (
                <Result
                  key={item.id}
                  href={item.href}
                  label={item.label}
                  onPick={() => setQuery("")}
                />
              ))}
            </ResultGroup>
          ) : null}
          {groups.length ? (
            <ResultGroup title="Grup">
              {groups.map((group) => (
                <Result
                  key={group.id}
                  href={`/groups/${group.id}`}
                  label={`${group.emoji} ${group.name}`}
                  onPick={() => setQuery("")}
                />
              ))}
            </ResultGroup>
          ) : null}
          {transactions.length ? (
            <ResultGroup title="Transaksi">
              {transactions.map((row) => (
                <Result
                  key={row.id}
                  href={`/history/${row.id}`}
                  label={row.title}
                  onPick={() => setQuery("")}
                />
              ))}
            </ResultGroup>
          ) : null}
          {!menus.length && !groups.length && !transactions.length ? (
            <p className="p-3 text-sm text-[var(--text-secondary)]">
              Tidak ada hasil.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
function ResultGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="px-3 pt-2 text-xs font-black uppercase text-[var(--text-secondary)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
function Result({
  href,
  label,
  onPick,
}: {
  href: string;
  label: string;
  onPick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onPick}
      className="block rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-[var(--brand-50)]"
    >
      {label}
    </Link>
  );
}
