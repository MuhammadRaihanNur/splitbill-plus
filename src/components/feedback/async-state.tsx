import type { ReactNode } from "react";
export function AsyncState({
  status,
  empty,
  children,
}: {
  status: "loading" | "empty" | "success" | "error";
  empty: ReactNode;
  children: ReactNode;
}) {
  if (status === "loading") return <p role="status">Memuat data…</p>;
  if (status === "error")
    return <p role="alert">Data gagal dimuat. Silakan coba lagi.</p>;
  if (status === "empty") return <>{empty}</>;
  return <>{children}</>;
}
