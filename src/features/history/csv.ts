import type { TransactionRecord } from "@/features/storage/models";
const cell = (value: string | number) => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
export function buildCsv(rows: readonly TransactionRecord[]): string {
  const data = rows.map((row) =>
    [
      row.createdAt.slice(0, 10),
      row.title,
      row.category,
      row.groupName ?? "",
      row.status,
      row.subtotal,
      row.tax,
      row.serviceCharge,
      row.tip,
      row.grandTotal,
    ]
      .map(cell)
      .join(","),
  );
  return `\uFEFFTanggal,Judul,Kategori,Grup,Status,Subtotal,Pajak,Layanan,Tip,Total\r\n${data.join("\r\n")}`;
}
export function downloadCsv(rows: readonly TransactionRecord[]): void {
  const url = URL.createObjectURL(
    new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `splitbill-riwayat-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
