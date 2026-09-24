"use client";
import {
  Camera,
  FileImage,
  LoaderCircle,
  Plus,
  ScanLine,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast-provider";
import { validateReceiptFile } from "@/features/receipt/file-validation";
import { parseReceiptText } from "@/features/receipt/parser";
import type { ParsedReceiptItem } from "@/features/receipt/types";
import {
  draftRepository,
  settingsRepository,
} from "@/features/storage/repositories";

type EditableItem = ParsedReceiptItem & { id: string; selected: boolean };
export function ReceiptWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const controller = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
      controller.current?.abort();
    },
    [preview],
  );
  function choose(next?: File) {
    if (!next) return;
    const result = validateReceiptFile(next);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setError("");
    setProgress(0);
  }
  function addItem(item: Partial<ParsedReceiptItem> = {}) {
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: item.name ?? "",
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
        selected: true,
      },
    ]);
  }
  async function scan() {
    if (!file) return;
    controller.current?.abort();
    const aborter = new AbortController();
    controller.current = aborter;
    setWorking(true);
    setError("");
    try {
      const { recognizeReceipt } =
        await import("@/features/receipt/ocr-adapter");
      const text = await recognizeReceipt(file, {
        signal: aborter.signal,
        onProgress: setProgress,
      });
      const parsed = parseReceiptText(text);
      setItems(
        parsed.map((item) => ({
          ...item,
          id: crypto.randomUUID(),
          selected: true,
        })),
      );
      if (!parsed.length)
        setError(
          "Item belum terbaca. Tambahkan atau koreksi item secara manual.",
        );
    } catch (cause) {
      if ((cause as Error).name !== "AbortError")
        setError(
          "Scan gagal. Foto tetap tersimpan dan item bisa diisi manual.",
        );
    } finally {
      setWorking(false);
    }
  }
  async function handoff() {
    const chosen = items.filter(
      (item) => item.selected && item.name.trim() && item.unitPrice > 0,
    );
    if (!chosen.length) {
      toast.error("Pilih minimal satu item valid");
      return;
    }
    const settings = await settingsRepository.get();
    await draftRepository.save({
      id: "active-split",
      title: file?.name.replace(/\.[^.]+$/, "") || "Hasil scan struk",
      mode: "item",
      subtotal: chosen.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
      taxBasisPoints: settings.defaultTaxBasisPoints,
      serviceBasisPoints: settings.defaultServiceBasisPoints,
      tip: 0,
      status: "completed",
      participantIds: [],
      customAmounts: {},
      items: chosen.map((item) => ({
        id: item.id,
        name: item.name.trim(),
        price: item.unitPrice,
        quantity: item.quantity,
        ownerIds: [],
      })),
      updatedAt: new Date().toISOString(),
    });
    router.push("/split-bill");
  }
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold text-[var(--brand-500)]">
          OCR + editor manual
        </p>
        <h1 className="text-3xl font-black">Scan Struk</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Unggah foto, periksa hasil, lalu lanjutkan ke pembagian per item.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <section className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
          <label className="grid min-h-48 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-[var(--brand-100)] bg-[var(--brand-50)] p-6 text-center">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => choose(e.target.files?.[0])}
            />
            <span>
              <FileImage
                className="mx-auto text-[var(--brand-500)]"
                size={38}
              />
              <strong className="mt-3 block">Pilih foto struk</strong>
              <small>JPG, PNG, WebP · maks. 10 MB</small>
            </span>
          </label>
          <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border font-bold">
            <Camera size={18} /> Ambil dari kamera
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => choose(e.target.files?.[0])}
            />
          </label>
          {preview ? (
            <Image
              src={preview}
              alt="Pratinjau struk terpilih"
              width={720}
              height={480}
              unoptimized
              className="mt-4 max-h-80 w-full rounded-xl object-contain"
            />
          ) : null}
          <button
            type="button"
            disabled={!file || working}
            onClick={() => void scan()}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-500)] font-black text-white disabled:opacity-50"
          >
            {working ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : (
              <ScanLine size={18} />
            )}{" "}
            {working
              ? `Memindai ${Math.round(progress * 100)}%`
              : "Scan sekarang"}
          </button>
          {working ? (
            <button
              type="button"
              onClick={() => controller.current?.abort()}
              className="mt-2 min-h-11 w-full rounded-xl border font-bold"
            >
              Batalkan scan
            </button>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
        </section>
        <section className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Item struk</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Editor selalu bisa dipakai, meski OCR gagal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => addItem()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 font-bold"
            >
              <Plus size={17} /> Tambah
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {items.length ? (
              items.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-2 rounded-xl border border-[var(--surface-border)] p-3 sm:grid-cols-[auto_1fr_90px_130px_auto]"
                >
                  <input
                    aria-label={`Pilih ${item.name || "item"}`}
                    type="checkbox"
                    checked={item.selected}
                    onChange={(e) =>
                      setItems((rows) =>
                        rows.map((row) =>
                          row.id === item.id
                            ? { ...row, selected: e.target.checked }
                            : row,
                        ),
                      )
                    }
                  />
                  <div>
                    <input
                      aria-label="Nama item struk"
                      className={inputClass}
                      placeholder="Nama item"
                      value={item.name}
                      onChange={(e) =>
                        setItems((rows) =>
                          rows.map((row) =>
                            row.id === item.id
                              ? { ...row, name: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                    {item.estimated ? (
                      <small className="mt-1 block font-semibold text-[var(--warning)]">
                        Estimasi dari selisih subtotal — mohon periksa
                      </small>
                    ) : null}
                  </div>
                  <input
                    aria-label={`Jumlah ${item.name || "item"}`}
                    className={inputClass}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      setItems((rows) =>
                        rows.map((row) =>
                          row.id === item.id
                            ? { ...row, quantity: Number(e.target.value) }
                            : row,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Harga ${item.name || "item"}`}
                    className={inputClass}
                    inputMode="numeric"
                    value={item.unitPrice || ""}
                    onChange={(e) =>
                      setItems((rows) =>
                        rows.map((row) =>
                          row.id === item.id
                            ? {
                                ...row,
                                unitPrice: Number(
                                  e.target.value.replace(/\D/g, ""),
                                ),
                              }
                            : row,
                        ),
                      )
                    }
                  />
                  <button
                    aria-label={`Hapus ${item.name || "item"}`}
                    type="button"
                    onClick={() =>
                      setItems((rows) =>
                        rows.filter((row) => row.id !== item.id),
                      )
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-[var(--surface-muted)] p-4 text-sm">
                Belum ada item. Scan foto atau tambahkan manual.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handoff()}
            disabled={!items.some((x) => x.selected)}
            className="mt-5 min-h-12 w-full rounded-xl bg-[var(--brand-500)] font-black text-white disabled:opacity-50"
          >
            Lanjut ke Split per Item
          </button>
        </section>
      </div>
    </div>
  );
}
