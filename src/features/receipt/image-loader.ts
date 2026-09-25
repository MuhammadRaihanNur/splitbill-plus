export interface ImageSize {
  width: number;
  height: number;
}

export type ReceiptImageDecoder = (file: File) => Promise<ImageBitmap>;

function abortError(): DOMException {
  return new DOMException("Pemrosesan gambar dibatalkan.", "AbortError");
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

export function calculateWorkingSize(
  width: number,
  height: number,
  deviceMemory?: number,
): ImageSize {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const longEdgeLimit =
    deviceMemory !== undefined && deviceMemory <= 2 ? 2000 : 3000;
  const scale = Math.min(1, longEdgeLimit / Math.max(safeWidth, safeHeight));

  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

export async function loadReceiptImage(
  file: File,
  signal: AbortSignal,
  decode: ReceiptImageDecoder = (imageFile) =>
    createImageBitmap(imageFile, { imageOrientation: "from-image" }),
): Promise<ImageBitmap> {
  throwIfAborted(signal);
  const bitmap = await decode(file);

  if (signal.aborted) {
    bitmap.close();
    throw abortError();
  }

  return bitmap;
}
