"use client";

import { Camera, FileImage, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast-provider";
import { validateReceiptFile } from "@/features/receipt/file-validation";
import type { ParsedReceiptItem } from "@/features/receipt/types";
import type { ReceiptScannerDependencies } from "@/features/receipt/use-receipt-scanner";
import { useReceiptScanner } from "@/features/receipt/use-receipt-scanner";
import {
  draftRepository,
  settingsRepository,
} from "@/features/storage/repositories";
import { formatRupiah } from "@/lib/formatters";

import { ReceiptImageEditor } from "./receipt-image-editor";
import { ReceiptProgress } from "./receipt-progress";

type EditableItem = ParsedReceiptItem & { id: string; selected: boolean };

function safePositiveInteger(value: string): number {
  const parsed = Number(value.replace(/\D/g, ""));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

function safeItemTotal(items: EditableItem[]): number {
  let total = 0;
  for (const item of items) {
    const lineTotal = item.quantity * item.unitPrice;
    if (
      !Number.isSafeInteger(lineTotal) ||
      !Number.isSafeInteger(total + lineTotal)
    ) {
      return 0;
    }
    total += lineTotal;
  }
  return total;
}

export function ReceiptWorkspace({
  scannerDependencies,
}: {
  scannerDependencies?: ReceiptScannerDependencies;
} = {}) {
  const router = useRouter();
  const toast = useToast();
  const scanner = useReceiptScanner(scannerDependencies);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [uploadError, setUploadError] = useState("");

  function replaceItems(candidateId: string, nextItems: ParsedReceiptItem[]) {
    setItems(
      nextItems.map((item, index) => ({
        ...item,
        id: `${candidateId}-${index}`,
        selected: true,
      })),
    );
  }

  async function choose(next?: File) {
    if (!next) return;
    const result = validateReceiptFile(next);
    if (!result.ok) {
      setUploadError(result.message);
      return;
    }
    setUploadError("");
    await scanner.selectFile(next);
  }

  function addItem(item: Partial<ParsedReceiptItem> = {}) {
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: item.name ?? "",
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
        confidence: 1,
        source: "manual",
        selected: true,
      },
    ]);
  }

  function updateItem(id: string, changes: Partial<ParsedReceiptItem>) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...changes,
              source: "manual",
              confidence: 1,
              estimated: false,
            }
          : item,
      ),
    );
  }

  async function handoff() {
    const chosen = items.filter(
      (item) =>
        item.selected &&
        item.name.trim() &&
        Number.isSafeInteger(item.quantity) &&
        item.quantity > 0 &&
        Number.isSafeInteger(item.unitPrice) &&
        item.unitPrice > 0 &&
        Number.isSafeInteger(item.quantity * item.unitPrice),
    );
    if (!chosen.length) {
      toast.error("Pilih minimal satu item valid");
      return;
    }
    const chosenTotal = safeItemTotal(chosen);
    if (chosenTotal <= 0) {
      toast.error("Total item terlalu besar atau tidak valid");
      return;
    }
    const settings = await settingsRepository.get();
    await draftRepository.save({
      id: "active-split",
      title: scanner.fileName.replace(/\.[^.]+$/, "") || "Hasil scan struk",
      mode: "item",
      subtotal: chosenTotal,
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

  const selectedReceipt = scanner.selected?.interpreted;
  const itemTotal = safeItemTotal(items);
  const difference = (selectedReceipt?.subtotal ?? itemTotal) - itemTotal;
  const error = uploadError || scanner.error;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold text-[var(--brand-500)]">
          OCR lokal + editor manual
        </p>
        <h1 className="text-3xl font-black">Scan Struk</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Foto diproses di perangkat ini. Atur area, periksa semua harga, lalu
          lanjutkan.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="space-y-4 rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid min-h-32 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-[var(--brand-100)] bg-[var(--brand-50)] p-4 text-center">
              <input
                aria-label="Pilih foto struk"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => void choose(event.target.files?.[0])}
              />
              <span>
                <FileImage
                  className="mx-auto text-[var(--brand-500)]"
                  size={30}
                />
                <strong className="mt-2 block">Pilih foto struk</strong>
                <small>JPG, PNG, WebP · maks. 10 MB</small>
              </span>
            </label>
            <label className="grid min-h-32 cursor-pointer place-items-center rounded-2xl border border-[var(--surface-border)] p-4 text-center font-bold">
              <input
                aria-label="Ambil foto struk dari kamera"
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => void choose(event.target.files?.[0])}
              />
              <span>
                <Camera className="mx-auto text-[var(--brand-500)]" size={30} />
                <span className="mt-2 block">Ambil dari kamera</span>
              </span>
            </label>
          </div>

          {scanner.status === "processing" ? (
            <ReceiptProgress
              progress={scanner.progress}
              onCancel={scanner.cancel}
            />
          ) : null}

          {scanner.previewUrl &&
          scanner.polygon &&
          scanner.originalPolygon &&
          scanner.status !== "processing" ? (
            <ReceiptImageEditor
              previewUrl={scanner.previewUrl}
              imageSize={scanner.imageSize}
              polygon={scanner.polygon}
              originalPolygon={scanner.originalPolygon}
              rotation={scanner.rotation}
              onPolygonChange={scanner.setPolygon}
              onRotate={scanner.setRotation}
              onReset={scanner.resetPolygon}
              onAutoCrop={() => void scanner.redetect()}
              onConfirm={() => {
                void scanner.scan().then((output) => {
                  if (output) {
                    replaceItems(output.best.id, output.interpreted.items);
                  }
                });
              }}
            />
          ) : null}

          {scanner.status === "review" ? (
            <button
              type="button"
              onClick={scanner.edit}
              className="min-h-11 w-full rounded-xl border font-bold"
            >
              Atur ulang area dan scan lagi
            </button>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-[var(--danger)]"
            >
              {error}
            </p>
          ) : null}
        </section>

        <section className="rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Item struk</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Nilai estimasi dan keyakinan rendah wajib kamu periksa.
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

          {scanner.alternatives.length > 1 ? (
            <div
              className="mt-4 flex flex-wrap gap-2"
              aria-label="Alternatif hasil scan"
            >
              {scanner.alternatives.map((alternative, index) => (
                <button
                  key={alternative.candidate.id}
                  type="button"
                  aria-pressed={
                    scanner.selected?.candidate.id === alternative.candidate.id
                  }
                  onClick={() => {
                    scanner.selectCandidate(alternative.candidate.id);
                    replaceItems(
                      alternative.candidate.id,
                      alternative.interpreted.items,
                    );
                  }}
                  className="min-h-10 rounded-xl border px-3 text-sm font-bold aria-pressed:border-[var(--brand-500)] aria-pressed:bg-[var(--brand-50)] aria-pressed:text-[var(--brand-600)]"
                >
                  Hasil {index + 1}
                </button>
              ))}
            </div>
          ) : null}

          {selectedReceipt ? (
            <div className="mt-4 grid gap-2 rounded-2xl bg-[var(--surface-muted)] p-4 sm:grid-cols-3">
              <Metric
                label="Subtotal struk"
                value={formatRupiah(selectedReceipt.subtotal ?? 0)}
              />
              <Metric label="Total item" value={formatRupiah(itemTotal)} />
              <Metric
                label="Selisih"
                value={formatRupiah(Math.abs(difference))}
              />
              {selectedReceipt.issues.map((issue) => (
                <p
                  key={`${issue.code}-${issue.message}`}
                  className="text-sm text-[var(--warning)] sm:col-span-3"
                >
                  {issue.message}
                </p>
              ))}
            </div>
          ) : null}

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
                    onChange={(event) =>
                      setItems((rows) =>
                        rows.map((row) =>
                          row.id === item.id
                            ? { ...row, selected: event.target.checked }
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
                      onChange={(event) =>
                        updateItem(item.id, { name: event.target.value })
                      }
                    />
                    {item.estimated ? (
                      <small className="mt-1 block font-semibold text-[var(--warning)]">
                        Estimasi — mohon periksa
                      </small>
                    ) : item.confidence !== undefined &&
                      item.confidence < 0.6 ? (
                      <small className="mt-1 block font-semibold text-[var(--warning)]">
                        Keyakinan rendah — mohon periksa
                      </small>
                    ) : null}
                  </div>
                  <input
                    aria-label={`Jumlah ${item.name || "item"}`}
                    className={inputClass}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(item.id, {
                        quantity: safePositiveInteger(event.target.value),
                      })
                    }
                  />
                  <input
                    aria-label={`Harga ${item.name || "item"}`}
                    className={inputClass}
                    inputMode="numeric"
                    value={item.unitPrice || ""}
                    onChange={(event) =>
                      updateItem(item.id, {
                        unitPrice: safePositiveInteger(event.target.value),
                      })
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
            disabled={!items.some((item) => item.selected)}
            className="mt-5 min-h-12 w-full rounded-xl bg-[var(--brand-500)] font-black text-white disabled:opacity-50"
          >
            Lanjut ke Split per Item
          </button>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-[var(--text-secondary)]">{label}</p>
      <strong className="mt-1 block">{value}</strong>
    </div>
  );
}
