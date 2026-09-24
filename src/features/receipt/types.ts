export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  estimated?: boolean;
}
export interface OcrCallbacks {
  onProgress: (value: number) => void;
  signal: AbortSignal;
}
export interface OcrAdapter {
  recognize: (file: File, callbacks: OcrCallbacks) => Promise<string>;
}
