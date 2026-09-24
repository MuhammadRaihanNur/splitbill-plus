"use client";

import { Settings } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import Image from "next/image";
import Link from "next/link";
import { GlobalSearch } from "@/features/search/components/global-search";
import { settingsRepository } from "@/features/storage/repositories";

export function Topbar() {
  const profileName = useLiveQuery(
    () => settingsRepository.get().then((settings) => settings.profileName),
    [],
    "Raihan",
  );
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--surface-border)] bg-[var(--surface-card)] backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[var(--content-max-width)] items-center gap-3 px-4 md:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="SplitBill+ - Beranda"
          className="shrink-0 md:hidden"
        >
          <Image
            src="/assets/app-icon.png"
            alt=""
            width={42}
            height={42}
            className="h-10 w-10 rounded-xl object-cover"
            priority
          />
        </Link>

        <div role="search" className="hidden w-full max-w-[480px] sm:block">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/settings"
            aria-label="Buka pengaturan profil"
            className="flex min-h-11 items-center gap-2 rounded-xl border border-transparent px-1.5 py-1 transition hover:border-[var(--surface-border)] hover:bg-[var(--surface-card)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] font-bold text-white">
              {profileName.trim().charAt(0).toUpperCase() || "S"}
            </span>
            <span className="hidden text-left leading-tight lg:block">
              <span className="block text-sm font-bold">{profileName}</span>
              <span className="block text-xs text-[var(--text-secondary)]">
                Pengaturan akun
              </span>
            </span>
            <Settings
              aria-hidden="true"
              size={18}
              className="text-[var(--text-secondary)] lg:hidden"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
