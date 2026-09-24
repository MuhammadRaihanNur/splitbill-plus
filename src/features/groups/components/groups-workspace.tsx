"use client";
import { Pencil, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast-provider";
import type { GroupRecord, ParticipantRecord } from "@/features/storage/models";
import {
  groupRepository,
  participantRepository,
} from "@/features/storage/repositories";

export function GroupsWorkspace() {
  const toast = useToast();
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GroupRecord>();
  const [form, setForm] = useState({
    name: "",
    description: "",
    emoji: "👥",
    memberIds: [] as string[],
  });
  const [memberName, setMemberName] = useState("");
  const reload = async () => {
    const [groupRows, people] = await Promise.all([
      groupRepository.list(),
      participantRepository.list(),
    ]);
    setGroups(groupRows);
    setParticipants(people);
  };
  useEffect(() => {
    void Promise.all([
      groupRepository.list(),
      participantRepository.list(),
    ]).then(([groupRows, people]) => {
      setGroups(groupRows);
      setParticipants(people);
    });
  }, []);
  function begin(group?: GroupRecord) {
    setEditing(group);
    setForm(
      group
        ? {
            name: group.name,
            description: group.description,
            emoji: group.emoji,
            memberIds: group.memberIds,
          }
        : { name: "", description: "", emoji: "👥", memberIds: [] },
    );
    setOpen(true);
  }
  async function addMember() {
    if (!memberName.trim()) return;
    let person = participants.find(
      (x) => x.name.toLowerCase() === memberName.trim().toLowerCase(),
    );
    person ??= await participantRepository.create({ name: memberName });
    setParticipants((rows) =>
      rows.some((x) => x.id === person.id) ? rows : [...rows, person],
    );
    setForm((current) => ({
      ...current,
      memberIds: current.memberIds.includes(person.id)
        ? current.memberIds
        : [...current.memberIds, person.id],
    }));
    setMemberName("");
  }
  async function save() {
    if (!form.name.trim()) return;
    if (editing)
      await groupRepository.update(editing.id, {
        ...form,
        name: form.name.trim(),
      });
    else await groupRepository.create({ ...form, name: form.name.trim() });
    setOpen(false);
    await reload();
    toast.success(editing ? "Grup diperbarui" : "Grup dibuat");
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--brand-500)]">
            Patungan berulang
          </p>
          <h1 className="text-3xl font-black">Grup</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Simpan anggota keluarga, teman, atau rekan kerja.
          </p>
        </div>
        <button
          type="button"
          onClick={() => begin()}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--brand-500)] px-5 font-black text-white"
        >
          <Plus size={18} /> Buat grup
        </button>
      </header>
      {groups.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <article
              key={group.id}
              className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--brand-50)] text-2xl">
                  {group.emoji}
                </span>
                <button
                  type="button"
                  aria-label={`Edit ${group.name}`}
                  onClick={() => begin(group)}
                  className="grid h-11 w-11 place-items-center rounded-xl border"
                >
                  <Pencil size={17} />
                </button>
              </div>
              <h2 className="mt-4 text-xl font-black">{group.name}</h2>
              <p className="mt-1 min-h-10 text-sm text-[var(--text-secondary)]">
                {group.description || "Grup patungan"}
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm font-bold">
                <UsersRound size={17} /> {group.memberIds.length} anggota
              </p>
              <div className="mt-5 flex gap-2">
                <Link
                  href={`/groups/${group.id}`}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[var(--brand-500)] font-bold text-white"
                >
                  Lihat detail
                </Link>
                <ConfirmDialog
                  triggerLabel="Hapus"
                  title="Hapus grup?"
                  description="Riwayat transaksi tetap tersimpan dengan nama grup saat transaksi dibuat."
                  onConfirm={async () => {
                    await groupRepository.remove(group.id);
                    await reload();
                    toast.success("Grup dihapus");
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-10 text-center shadow-[var(--shadow-card)]">
          <UsersRound className="mx-auto text-[var(--brand-500)]" size={42} />
          <h2 className="mt-3 text-xl font-black">Belum ada grup</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Buat grup agar peserta bisa langsung dimuat saat split bill.
          </p>
        </div>
      )}
      <Dialog
        open={open}
        title={editing ? "Edit grup" : "Buat grup"}
        onClose={() => setOpen(false)}
      >
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-bold">
            Nama grup
            <input
              className={`${inputClass} mt-1.5`}
              value={form.name}
              onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-bold">
            Deskripsi
            <textarea
              className={`${inputClass} mt-1.5 py-3`}
              value={form.description}
              onChange={(e) =>
                setForm((x) => ({ ...x, description: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm font-bold">
            Emoji
            <input
              className={`${inputClass} mt-1.5`}
              value={form.emoji}
              onChange={(e) =>
                setForm((x) => ({ ...x, emoji: e.target.value }))
              }
            />
          </label>
          <div>
            <label className="text-sm font-bold" htmlFor="member-name">
              Nama anggota baru
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="member-name"
                className={inputClass}
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />
              <button
                type="button"
                onClick={() => void addMember()}
                className="min-h-11 shrink-0 rounded-xl border px-3 font-bold"
              >
                Tambah anggota
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.memberIds.map((memberId) => {
              const person = participants.find((x) => x.id === memberId);
              return (
                <button
                  type="button"
                  key={memberId}
                  onClick={() =>
                    setForm((x) => ({
                      ...x,
                      memberIds: x.memberIds.filter((id) => id !== memberId),
                    }))
                  }
                  className="rounded-full bg-[var(--brand-50)] px-3 py-2 text-sm font-bold"
                >
                  {person?.name ?? "Anggota"} ×
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-11 rounded-xl border px-4 font-bold"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void save()}
              className="min-h-11 rounded-xl bg-[var(--brand-500)] px-4 font-black text-white"
            >
              Simpan grup
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
