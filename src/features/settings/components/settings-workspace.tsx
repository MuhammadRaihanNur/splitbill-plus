"use client";
import {
  Database,
  Download,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { inputClass } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import {
  clearApplicationData,
  downloadBackup,
  exportBackup,
  importBackup,
} from "@/features/settings/backup";
import { useTheme } from "@/features/settings/theme-provider";
import type { AppSettings, TaxCacheRecord } from "@/features/storage/models";
import {
  settingsRepository,
  taxRepository,
} from "@/features/storage/repositories";
import { BundledTaxProvider } from "@/features/tax/provider";

export function SettingsWorkspace() {
  const toast = useToast();
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>();
  const [tax, setTax] = useState<TaxCacheRecord>();
  const [clearText, setClearText] = useState("");
  const [pendingImport, setPendingImport] = useState<File>();
  useEffect(() => {
    void Promise.all([settingsRepository.get(), taxRepository.list()]).then(
      ([value, taxes]) => {
        setSettings(value);
        setTax(
          taxes.sort((a, b) =>
            b.effectiveDate.localeCompare(a.effectiveDate),
          )[0],
        );
        setTheme(value.theme);
      },
    );
  }, [setTheme]);
  if (!settings) return <p role="status">Memuat pengaturan…</p>;
  async function save() {
    if (!settings) return;
    const saved = await settingsRepository.update(settings);
    setSettings(saved);
    setTheme(saved.theme);
    toast.success("Pengaturan disimpan");
  }
  async function refreshTax() {
    try {
      const latest = await new BundledTaxProvider().fetchLatest();
      await taxRepository.putMany([latest]);
      setTax(latest);
      setSettings((current) =>
        current
          ? { ...current, defaultTaxBasisPoints: latest.rateBasisPoints }
          : current,
      );
      toast.success("Data pajak diperbarui");
    } catch {
      toast.error(
        tax
          ? "Pembaruan gagal, data cache tetap digunakan"
          : "Data pajak gagal dimuat",
      );
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      await importBackup(JSON.parse(await file.text()));
      const next = await settingsRepository.get();
      setSettings(next);
      setTheme(next.theme);
      toast.success("Backup berhasil dipulihkan");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Backup tidak valid",
      );
    }
  }
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold text-[var(--brand-500)]">
          Preferensi lokal
        </p>
        <h1 className="text-3xl font-black">Pengaturan</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Sesuaikan profil, tema, hitungan awal, pajak, dan data aplikasi.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section icon={<Settings2 />} title="Profil & tampilan">
          <label className="block text-sm font-bold">
            Nama profil
            <input
              className={`${inputClass} mt-1.5`}
              value={settings.profileName}
              onChange={(e) =>
                setSettings({ ...settings, profileName: e.target.value })
              }
            />
          </label>
          <fieldset className="mt-4">
            <legend className="text-sm font-bold">Tema</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["light", "dark", "system"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={settings.theme === option}
                  onClick={() => {
                    setSettings({ ...settings, theme: option });
                    setTheme(option);
                  }}
                  className={`min-h-11 rounded-xl border px-3 font-bold ${settings.theme === option ? "border-[var(--brand-500)] bg-[var(--brand-50)]" : ""}`}
                >
                  {option === "light"
                    ? "Terang"
                    : option === "dark"
                      ? "Gelap"
                      : "Sistem"}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            onClick={() => void save()}
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--brand-500)] px-5 font-black text-white"
          >
            <Save size={18} /> Simpan pengaturan
          </button>
        </Section>
        <Section icon={<RefreshCw />} title="Default tagihan & pajak">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">
              Pajak default (%)
              <input
                type="number"
                min="0"
                step="0.01"
                className={`${inputClass} mt-1.5`}
                value={settings.defaultTaxBasisPoints / 100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultTaxBasisPoints: Math.round(
                      Number(e.target.value) * 100,
                    ),
                  })
                }
              />
            </label>
            <label className="text-sm font-bold">
              Layanan default (%)
              <input
                type="number"
                min="0"
                step="0.01"
                className={`${inputClass} mt-1.5`}
                value={settings.defaultServiceBasisPoints / 100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultServiceBasisPoints: Math.round(
                      Number(e.target.value) * 100,
                    ),
                  })
                }
              />
            </label>
          </div>
          <div className="mt-4 rounded-xl bg-[var(--surface-muted)] p-4 text-sm">
            {tax ? (
              <>
                <strong>
                  {tax.name} {tax.rateBasisPoints / 100}%
                </strong>
                <p>
                  Berlaku{" "}
                  {new Date(tax.effectiveDate).toLocaleDateString("id-ID")} ·
                  snapshot lokal
                </p>
              </>
            ) : (
              <p>Belum ada cache pajak.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void refreshTax()}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-bold"
          >
            <RefreshCw size={17} /> Perbarui snapshot pajak
          </button>
        </Section>
        <Section icon={<Database />} title="Backup & pemulihan">
          <p className="text-sm text-[var(--text-secondary)]">
            Ekspor semua data IndexedDB ke JSON atau pulihkan backup yang valid.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void exportBackup().then(downloadBackup)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-bold"
            >
              <Download size={17} /> Ekspor JSON
            </button>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 font-bold">
              <Upload size={17} /> Impor JSON
              <input
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={(e) => setPendingImport(e.target.files?.[0])}
              />
            </label>
          </div>
        </Section>
        <Section icon={<Trash2 />} title="Hapus semua data">
          <p className="text-sm text-[var(--text-secondary)]">
            Ketik <strong>HAPUS DATA</strong> untuk menghapus transaksi, grup,
            peserta, cache, dan draft.
          </p>
          <input
            aria-label="Konfirmasi hapus semua data"
            className={`${inputClass} mt-4`}
            value={clearText}
            onChange={(e) => setClearText(e.target.value)}
          />
          <button
            type="button"
            disabled={clearText !== "HAPUS DATA"}
            onClick={async () => {
              await clearApplicationData();
              const defaults = await settingsRepository.get();
              setSettings(defaults);
              setTheme(defaults.theme);
              setTax(undefined);
              setClearText("");
              toast.success("Semua data telah dihapus");
            }}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--danger)] px-4 font-black text-white disabled:opacity-40"
          >
            <Trash2 size={17} /> Hapus semua data
          </button>
        </Section>
      </div>
      <Dialog
        open={Boolean(pendingImport)}
        title="Pulihkan backup?"
        onClose={() => setPendingImport(undefined)}
      >
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Data saat ini akan diganti setelah file lolos validasi. Proses ini
          dijalankan secara atomik.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setPendingImport(undefined)}
            className="min-h-11 rounded-xl border px-4 font-bold"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={async () => {
              const file = pendingImport;
              setPendingImport(undefined);
              await importFile(file);
            }}
            className="min-h-11 rounded-xl bg-[var(--brand-500)] px-4 font-black text-white"
          >
            Pulihkan backup
          </button>
        </div>
      </Dialog>
    </div>
  );
}
function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-5 flex items-center gap-3 text-[var(--brand-500)]">
        {icon}
        <h2 className="text-xl font-black text-[var(--text-primary)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
