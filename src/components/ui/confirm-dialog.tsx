"use client";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";

export function ConfirmDialog({
  triggerLabel,
  title,
  description = "Tindakan ini tidak dapat dibatalkan.",
  onConfirm,
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-xl border border-[var(--danger)] px-4 font-bold text-[var(--danger)]"
      >
        {triggerLabel}
      </button>
      <Dialog open={open} title={title} onClose={() => setOpen(false)}>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-11 rounded-xl border px-4 font-bold"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
              setOpen(false);
            }}
            className="min-h-11 rounded-xl bg-[var(--danger)] px-4 font-bold text-white"
          >
            Ya, hapus
          </button>
        </div>
      </Dialog>
    </>
  );
}
