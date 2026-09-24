"use client";

import { Copy, Plus, RotateCcw, Save, Share2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast-provider";
import {
  calculateCustomSplit,
  calculateEqualSplit,
  calculateItemSplit,
} from "@/features/split-bill/calculator";
import { buildSplitSummary } from "@/features/split-bill/summary";
import type { CalculationResult } from "@/features/split-bill/types";
import type {
  DraftItem,
  GroupRecord,
  ParticipantSnapshot,
  SplitDraft,
  SplitMode,
  TransactionCategory,
  TransactionItemRecord,
  TransactionRecord,
} from "@/features/storage/models";
import {
  draftRepository,
  groupRepository,
  participantRepository,
  settingsRepository,
  transactionRepository,
} from "@/features/storage/repositories";
import { formatRupiah } from "@/lib/formatters";

const emptyDraft = (): SplitDraft => ({
  id: "active-split",
  title: "",
  mode: "equal",
  subtotal: 0,
  taxBasisPoints: 1100,
  serviceBasisPoints: 0,
  tip: 0,
  status: "completed",
  participantIds: [],
  customAmounts: {},
  items: [],
  updatedAt: new Date().toISOString(),
});

export function SplitBillWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<SplitDraft>(emptyDraft);
  const [people, setPeople] = useState<ParticipantSnapshot[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<TransactionCategory>("food");
  const [ready, setReady] = useState(false);
  const persistTimer = useRef<number | undefined>(undefined);
  const skipPersist = useRef(false);
  useEffect(() => {
    void (async () => {
      const [saved, settings, participants, groupRows] = await Promise.all([
        draftRepository.get(),
        settingsRepository.get(),
        participantRepository.list(),
        groupRepository.list(),
      ]);
      const next = saved ?? {
        ...emptyDraft(),
        taxBasisPoints: settings.defaultTaxBasisPoints,
        serviceBasisPoints: settings.defaultServiceBasisPoints,
      };
      setDraft(next);
      setPeople(
        participants.filter((person) =>
          next.participantIds.includes(person.id),
        ),
      );
      setGroups(groupRows);
      setReady(true);
    })();
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    persistTimer.current = window.setTimeout(
      () =>
        void draftRepository.save({
          ...draft,
          participantIds: people.map((x) => x.id),
          updatedAt: new Date().toISOString(),
        }),
      250,
    );
    return () => window.clearTimeout(persistTimer.current);
  }, [draft, people, ready]);
  const calculation = useMemo<CalculationResult>(() => {
    const common = {
      subtotal: draft.subtotal,
      taxBasisPoints: draft.taxBasisPoints,
      serviceBasisPoints: draft.serviceBasisPoints,
      tip: draft.tip,
      participants: people,
    };
    if (draft.mode === "custom")
      return calculateCustomSplit({
        ...common,
        customAmounts: draft.customAmounts,
      });
    if (draft.mode === "item")
      return calculateItemSplit({ ...common, items: draft.items });
    return calculateEqualSplit(common);
  }, [draft, people]);
  async function addPerson() {
    if (!name.trim()) return;
    const person = await participantRepository.create({ name });
    setPeople((current) => [...current, person]);
    setName("");
  }
  function selectGroup(groupId: string) {
    const group = groups.find((row) => row.id === groupId);
    setDraft((current) => ({ ...current, groupId: groupId || undefined }));
    if (group)
      void participantRepository
        .list()
        .then((all) =>
          setPeople(
            all.filter((person) => group.memberIds.includes(person.id)),
          ),
        );
  }
  function updateItem(itemId: string, changes: Partial<DraftItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, ...changes } : item,
      ),
    }));
  }
  function addItem() {
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: crypto.randomUUID(),
          name: "",
          price: 0,
          quantity: 1,
          ownerIds: [],
        },
      ],
    }));
  }
  async function save() {
    if (!calculation.value || !draft.title.trim()) {
      toast.error("Lengkapi judul dan pembagian tagihan");
      return;
    }
    window.clearTimeout(persistTimer.current);
    const timestamp = new Date().toISOString();
    const transactionId = crypto.randomUUID();
    const group = groups.find((x) => x.id === draft.groupId);
    const transaction: TransactionRecord = {
      id: transactionId,
      title: draft.title.trim(),
      category,
      groupId: group?.id,
      groupName: group?.name,
      participants: people,
      ...calculation.value,
      splitMode: draft.mode,
      status: draft.status,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const items: TransactionItemRecord[] =
      draft.mode === "item"
        ? draft.items.map((item) => ({ ...item, transactionId }))
        : [];
    await transactionRepository.saveAggregate(transaction, items);
    await draftRepository.clear();
    toast.success("Transaksi tersimpan");
    router.push(`/history/${transactionId}`);
  }
  async function share(kind: "copy" | "share") {
    if (!calculation.value) return;
    const text = buildSplitSummary(
      draft.title || "SplitBill+",
      calculation.value.grandTotal,
      calculation.value.splits,
    );
    if (kind === "share" && navigator.share)
      await navigator.share({ title: draft.title, text });
    else await navigator.clipboard.writeText(text);
    toast.success(
      kind === "share" ? "Ringkasan dibagikan" : "Ringkasan disalin",
    );
  }
  async function reset() {
    window.clearTimeout(persistTimer.current);
    skipPersist.current = true;
    setDraft(emptyDraft());
    setPeople([]);
    await draftRepository.clear();
    toast.success("Form dikosongkan");
  }
  if (!ready) return <p role="status">Memuat kalkulator…</p>;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold text-[var(--brand-500)]">
          Kalkulator pembagian
        </p>
        <h1 className="text-3xl font-black">Split Bill</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Bagi rata, atur nominal, atau tentukan pemilik setiap item.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <section className="space-y-5 rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
          <SegmentedControl
            label="Metode pembagian"
            value={draft.mode}
            options={
              [
                { value: "equal", label: "Bagi rata" },
                { value: "custom", label: "Nominal" },
                { value: "item", label: "Per item" },
              ] as const
            }
            onChange={(mode: SplitMode) => setDraft((x) => ({ ...x, mode }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">
              Judul tagihan
              <input
                className={`${inputClass} mt-1.5`}
                value={draft.title}
                onChange={(e) =>
                  setDraft((x) => ({ ...x, title: e.target.value }))
                }
              />
            </label>
            <label className="text-sm font-bold">
              Kategori
              <select
                className={`${inputClass} mt-1.5`}
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as TransactionCategory)
                }
              >
                <option value="food">Makanan</option>
                <option value="transport">Transportasi</option>
                <option value="shopping">Belanja</option>
                <option value="entertainment">Hiburan</option>
                <option value="other">Lainnya</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-bold">
              Total tagihan
              <input
                inputMode="numeric"
                className={`${inputClass} mt-1.5`}
                value={draft.subtotal || ""}
                onChange={(e) =>
                  setDraft((x) => ({
                    ...x,
                    subtotal: Number(e.target.value.replace(/\D/g, "")),
                  }))
                }
              />
            </label>
            <label className="text-sm font-bold">
              Pajak (%)
              <input
                type="number"
                className={`${inputClass} mt-1.5`}
                value={draft.taxBasisPoints / 100}
                onChange={(e) =>
                  setDraft((x) => ({
                    ...x,
                    taxBasisPoints: Math.round(Number(e.target.value) * 100),
                  }))
                }
              />
            </label>
            <label className="text-sm font-bold">
              Tip
              <input
                inputMode="numeric"
                className={`${inputClass} mt-1.5`}
                value={draft.tip || ""}
                onChange={(e) =>
                  setDraft((x) => ({
                    ...x,
                    tip: Number(e.target.value.replace(/\D/g, "")),
                  }))
                }
              />
            </label>
          </div>
          <label className="text-sm font-bold">
            Grup (opsional)
            <select
              className={`${inputClass} mt-1.5`}
              value={draft.groupId ?? ""}
              onChange={(e) => selectGroup(e.target.value)}
            >
              <option value="">Tanpa grup</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.emoji} {group.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <h2 className="font-black">Peserta</h2>
            <div className="mt-2 flex gap-2">
              <label className="sr-only" htmlFor="new-person">
                Nama peserta baru
              </label>
              <input
                id="new-person"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addPerson()}
              />
              <button
                type="button"
                onClick={() => void addPerson()}
                className="min-h-11 shrink-0 rounded-xl bg-[var(--brand-500)] px-4 font-bold text-white"
              >
                Tambah peserta
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {people.map((person) => (
                <span
                  key={person.id}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-50)] px-3 py-2 text-sm font-bold"
                >
                  {person.name}
                  <button
                    type="button"
                    aria-label={`Hapus ${person.name}`}
                    onClick={() =>
                      setPeople((x) => x.filter((p) => p.id !== person.id))
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </span>
              ))}
            </div>
          </div>
          {draft.mode === "custom" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {people.map((person) => (
                <label key={person.id} className="text-sm font-bold">
                  Nominal {person.name}
                  <input
                    inputMode="numeric"
                    className={`${inputClass} mt-1`}
                    value={draft.customAmounts[person.id] || ""}
                    onChange={(e) =>
                      setDraft((x) => ({
                        ...x,
                        customAmounts: {
                          ...x.customAmounts,
                          [person.id]: Number(
                            e.target.value.replace(/\D/g, ""),
                          ),
                        },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          ) : null}
          {draft.mode === "item" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-black">Daftar item</h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 font-bold"
                >
                  <Plus size={17} /> Tambah item
                </button>
              </div>
              {draft.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[var(--surface-border)] p-3"
                >
                  <div className="grid gap-2 sm:grid-cols-[1fr_130px_90px]">
                    <input
                      aria-label="Nama item"
                      placeholder="Nama item"
                      className={inputClass}
                      value={item.name}
                      onChange={(e) =>
                        updateItem(item.id, { name: e.target.value })
                      }
                    />
                    <input
                      aria-label={`Harga ${item.name || "item"}`}
                      inputMode="numeric"
                      placeholder="Harga"
                      className={inputClass}
                      value={item.price || ""}
                      onChange={(e) =>
                        updateItem(item.id, {
                          price: Number(e.target.value.replace(/\D/g, "")),
                        })
                      }
                    />
                    <input
                      aria-label={`Jumlah ${item.name || "item"}`}
                      type="number"
                      min="1"
                      className={inputClass}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, {
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {people.map((person) => (
                      <label
                        key={person.id}
                        className="flex items-center gap-1 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={item.ownerIds.includes(person.id)}
                          onChange={(e) =>
                            updateItem(item.id, {
                              ownerIds: e.target.checked
                                ? [...item.ownerIds, person.id]
                                : item.ownerIds.filter(
                                    (id) => id !== person.id,
                                  ),
                            })
                          }
                        />
                        {person.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={draft.status === "pending"}
              onChange={(e) =>
                setDraft((x) => ({
                  ...x,
                  status: e.target.checked ? "pending" : "completed",
                }))
              }
            />
            Tandai belum lunas
          </label>
        </section>
        <aside className="h-fit rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-500)] p-5 text-white shadow-[0_14px_34px_rgba(37,99,235,0.2)]">
          <h2 className="text-xl font-black">Ringkasan</h2>
          {calculation.value ? (
            <>
              <p className="mt-5 text-sm text-white/80">Total akhir</p>
              <p className="text-3xl font-black">
                {formatRupiah(calculation.value.grandTotal)}
              </p>
              <div className="mt-5 space-y-2">
                {calculation.value.splits.map((split) => (
                  <div
                    key={split.participantId}
                    className="flex justify-between rounded-xl bg-white/10 px-3 py-2"
                  >
                    <span>{split.participantName}</span>
                    <strong>{formatRupiah(split.amount)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p role="alert" className="mt-4 text-sm text-red-200">
              {calculation.issues[0]?.message ??
                "Tambahkan peserta dan nominal."}
            </p>
          )}
          <div className="mt-6 grid gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={!calculation.value}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand-500)] px-4 font-black disabled:opacity-50"
            >
              <Save size={18} /> Simpan transaksi
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void share("copy")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10"
              >
                <Copy size={17} /> Salin
              </button>
              <button
                type="button"
                onClick={() => void share("share")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10"
              >
                <Share2 size={17} /> Bagikan
              </button>
            </div>
            <button
              type="button"
              onClick={() => void reset()}
              className="inline-flex min-h-11 items-center justify-center gap-2 text-sm"
            >
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
