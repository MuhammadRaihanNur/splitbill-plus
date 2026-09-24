import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function NotFound() {
  return (
    <AppShell>
      <section className="mx-auto grid max-w-2xl place-items-center rounded-[var(--radius-xl)] bg-[var(--surface-card)] p-8 text-center shadow-[var(--shadow-card)]">
        <Image
          src="/assets/empty-error.png"
          alt="Ilustrasi halaman tidak ditemukan"
          width={220}
          height={180}
          className="h-40 w-auto"
        />
        <p className="mt-4 text-sm font-black text-[var(--brand-500)]">404</p>
        <h1 className="mt-1 text-3xl font-black">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-[var(--text-secondary)]">
          Alamat yang kamu buka tidak tersedia atau sudah berpindah.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[var(--brand-500)] px-5 font-black text-white"
        >
          Kembali ke Beranda
        </Link>
      </section>
    </AppShell>
  );
}
