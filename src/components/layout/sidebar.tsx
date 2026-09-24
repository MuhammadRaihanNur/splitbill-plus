"use client";

import Image from "next/image";
import Link from "next/link";

import { NavLink } from "@/components/layout/nav-link";
import { navigationItems } from "@/lib/navigation";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[88px] border-r border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-6 md:flex md:flex-col lg:w-[var(--sidebar-width)] lg:px-5">
      <Link
        href="/"
        aria-label="SplitBill+ - Beranda"
        className="mb-8 flex h-12 items-center justify-center overflow-hidden rounded-xl lg:justify-start lg:px-2"
      >
        <Image
          src="/assets/app-icon.png"
          alt=""
          width={42}
          height={42}
          className="h-10 w-10 rounded-xl object-cover lg:hidden"
          priority
        />
        <Image
          src="/assets/logo.png"
          alt="SplitBill+"
          width={158}
          height={62}
          className="hidden h-auto w-[158px] lg:block"
          priority
        />
      </Link>

      <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-1.5">
        {navigationItems.map((item) => (
          <NavLink key={item.id} item={item} />
        ))}
      </nav>

      <div className="hidden rounded-2xl border border-[var(--brand-100)] bg-[var(--brand-50)] p-4 text-[var(--brand-900)] lg:block">
        <p className="text-xs font-semibold text-[var(--brand-600)]">
          Split lebih cepat
        </p>
        <p className="mt-1 text-sm font-bold leading-snug">
          Tagihan rapi, pertemanan tetap asyik.
        </p>
      </div>
    </aside>
  );
}
