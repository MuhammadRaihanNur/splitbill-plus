import Image from "next/image";

import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";

export function EmptyState() {
  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      <Image
        src="/assets/empty-transactions.png"
        alt="Dompet kosong tanpa transaksi"
        width={236}
        height={142}
        className="h-auto w-[190px]"
      />
      <h2 className="mt-5 text-xl font-black">Belum ada transaksi</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
        Tagihan yang kamu buat akan tersimpan rapi dan muncul di sini.
      </p>
      <ButtonLink href="/split-bill" className="mt-5">
        Buat transaksi
      </ButtonLink>
    </Card>
  );
}
