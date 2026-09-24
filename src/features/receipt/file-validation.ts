export type ReceiptValidation =
  | { ok: true }
  | { ok: false; code: "unsupported_type" | "too_large"; message: string };
const supported = new Set(["image/jpeg", "image/png", "image/webp"]);
export function validateReceiptFile(file: File): ReceiptValidation {
  if (!supported.has(file.type))
    return {
      ok: false,
      code: "unsupported_type",
      message: "Gunakan gambar JPG, PNG, atau WebP.",
    };
  if (file.size > 10 * 1024 * 1024)
    return {
      ok: false,
      code: "too_large",
      message: "Ukuran gambar maksimal 10 MB.",
    };
  return { ok: true };
}
