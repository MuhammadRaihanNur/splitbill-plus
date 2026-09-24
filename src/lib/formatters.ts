const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number): string {
  if (!Number.isSafeInteger(amount)) {
    throw new TypeError("Nilai Rupiah harus berupa bilangan bulat aman");
  }

  return rupiahFormatter
    .format(amount)
    .replace(/\s+/g, " ")
    .replace(/^Rp\s?/, "Rp ");
}
