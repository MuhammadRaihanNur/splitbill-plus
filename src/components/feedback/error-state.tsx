"use client";

import Image from "next/image";

import { Card } from "@/components/ui/card";

interface ErrorStateProps {
  onRetry?: () => void;
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }

    window.location.reload();
  };

  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      <Image
        src="/assets/empty-error.png"
        alt="Ilustrasi koneksi bermasalah"
        width={240}
        height={142}
        className="h-auto w-[190px]"
      />
      <h2 className="mt-5 text-xl font-black">Konten belum bisa dimuat</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
        Ada kendala sementara. Periksa koneksi lalu coba sekali lagi.
      </p>
      <button
        type="button"
        onClick={handleRetry}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-500)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--brand-600)]"
      >
        Coba lagi
      </button>
    </Card>
  );
}
