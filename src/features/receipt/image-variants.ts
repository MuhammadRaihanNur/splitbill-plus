import type { PreprocessingMode, RightAngle } from "./scan-types";

export interface VariantPlanInput {
  lowMemory: boolean;
  needsMorePasses: boolean;
}

export interface RenderVariantOptions {
  orientation: RightAngle;
  preprocessing: PreprocessingMode;
  width?: number;
  height?: number;
}

type VariantSource = CanvasImageSource & { width: number; height: number };

function abortError(): DOMException {
  return new DOMException("Pemrosesan gambar dibatalkan.", "AbortError");
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

export function rotateDimensions(
  width: number,
  height: number,
  angle: RightAngle,
): { width: number; height: number } {
  return angle === 90 || angle === 270
    ? { width: height, height: width }
    : { width, height };
}

export function variantPlan({
  lowMemory,
  needsMorePasses,
}: VariantPlanInput): PreprocessingMode[] {
  if (!needsMorePasses) return ["grayscale"];
  if (lowMemory) return ["grayscale", "adaptive-threshold"];
  return ["grayscale", "contrast", "adaptive-threshold", "otsu", "sharpen"];
}

function thresholdPixels(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  adaptive: boolean,
): void {
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  let mean = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    mean +=
      pixels[index] * 0.299 +
      pixels[index + 1] * 0.587 +
      pixels[index + 2] * 0.114;
  }
  mean /= Math.max(1, pixels.length / 4);
  const threshold = adaptive ? Math.max(110, mean * 0.92) : mean;

  for (let index = 0; index < pixels.length; index += 4) {
    const luminance =
      pixels[index] * 0.299 +
      pixels[index + 1] * 0.587 +
      pixels[index + 2] * 0.114;
    const value = luminance >= threshold ? 255 : 0;
    pixels[index] = value;
    pixels[index + 1] = value;
    pixels[index + 2] = value;
  }
  context.putImageData(image, 0, 0);
}

export async function renderVariant(
  source: VariantSource,
  options: RenderVariantOptions,
  signal: AbortSignal,
): Promise<HTMLCanvasElement | ImageBitmap> {
  throwIfAborted(signal);
  const inputWidth = options.width ?? source.width;
  const inputHeight = options.height ?? source.height;
  const output = rotateDimensions(inputWidth, inputHeight, options.orientation);
  const canvas = document.createElement("canvas");
  canvas.width = output.width;
  canvas.height = output.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D tidak tersedia pada browser ini.");

  context.save();
  context.translate(output.width / 2, output.height / 2);
  context.rotate((options.orientation * Math.PI) / 180);
  context.filter =
    options.preprocessing === "grayscale"
      ? "grayscale(1)"
      : options.preprocessing === "contrast"
        ? "grayscale(1) contrast(1.65)"
        : options.preprocessing === "sharpen"
          ? "grayscale(1) contrast(1.25)"
          : "grayscale(1)";
  context.drawImage(
    source,
    -inputWidth / 2,
    -inputHeight / 2,
    inputWidth,
    inputHeight,
  );
  context.restore();
  throwIfAborted(signal);

  if (
    options.preprocessing === "adaptive-threshold" ||
    options.preprocessing === "otsu"
  ) {
    thresholdPixels(
      context,
      output.width,
      output.height,
      options.preprocessing === "adaptive-threshold",
    );
  }
  throwIfAborted(signal);

  if ("transferToImageBitmap" in canvas) {
    return (
      canvas as HTMLCanvasElement & { transferToImageBitmap(): ImageBitmap }
    ).transferToImageBitmap();
  }
  return canvas;
}
