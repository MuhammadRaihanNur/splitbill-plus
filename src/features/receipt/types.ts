export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  estimated?: boolean;
  confidence?: number;
  source?: "ocr" | "estimated" | "manual";
}
export interface OcrCallbacks {
  onProgress: (value: number) => void;
  signal: AbortSignal;
}
export interface OcrAdapter {
  recognize: (file: File, callbacks: OcrCallbacks) => Promise<string>;
}
