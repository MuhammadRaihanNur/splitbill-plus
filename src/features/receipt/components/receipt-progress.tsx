"use client";

import { LoaderCircle, X } from "lucide-react";

import type { ScanProgress, ScanStage } from "../scan-types";

const stageLabels: Record<ScanStage, string> = {
  "loading-image": "Menyiapkan gambar",
  "detecting-receipt": "Mendeteksi batas struk",
  "correcting-perspective": "Meluruskan perspektif",
  "preparing-variant": "Meningkatkan keterbacaan",
  "recognizing-text": "Membaca teks struk",
  "interpreting-layout": "Menyusun item dan harga",
  "reconciling-totals": "Memeriksa subtotal",
};

interface ReceiptProgressProps {
  progress: ScanProgress;
  onCancel: () => void;
}

export function ReceiptProgress({ progress, onCancel }: ReceiptProgressProps) {
  const percentage = Math.round(
    Math.min(1, Math.max(0, progress.progress)) * 100,
  );
  const elapsedSeconds = Math.round(progress.elapsedMs / 1000);

  return (
    <div className="rounded-2xl border border-[var(--brand-100)] bg-[var(--brand-50)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <LoaderCircle
            aria-hidden="true"
            className="mt-0.5 animate-spin text-[var(--brand-500)]"
            size={20}
          />
          <div aria-live="polite" aria-atomic="true">
            <p className="font-black text-[var(--text-primary)]">
              {stageLabels[progress.stage]}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Pass {progress.pass} dari {progress.totalPasses}
            </p>
          </div>
        </div>
        <span className="text-sm font-bold text-[var(--text-secondary)]">
          {elapsedSeconds} detik
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Progres scan struk"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="mt-4 h-2 overflow-hidden rounded-full bg-white"
      >
        <div
          className="h-full rounded-full bg-[var(--brand-500)] transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--surface-border)] bg-white px-4 font-bold"
      >
        <X size={17} aria-hidden="true" /> Batalkan scan
      </button>
    </div>
  );
}
