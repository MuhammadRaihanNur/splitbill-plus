"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { detectReceiptPolygon } from "./document-detector";
import { calculateWorkingSize, loadReceiptImage } from "./image-loader";
import type {
  AdaptiveOcrCallbacks,
  AdaptiveOcrInput,
  AdaptiveOcrResult,
  ScoredOcrCandidate,
} from "./ocr-orchestrator";
import { runAdaptiveOcr } from "./ocr-orchestrator";
import { correctPerspective } from "./perspective";
import { interpretReceipt } from "./receipt-interpreter";
import { reconcileReceipt } from "./receipt-reconciler";
import { createFullImagePolygon } from "./scan-types";
import type { ReceiptPolygon, RightAngle, ScanProgress } from "./scan-types";

export type ReceiptScannerStatus =
  | "idle"
  | "editing"
  | "processing"
  | "review"
  | "failed";

export type ScannerSource = CanvasImageSource & {
  width: number;
  height: number;
  close?: () => void;
};

interface CorrectedSource {
  canvas: HTMLCanvasElement;
  cleanup: () => void;
}

export interface ReceiptScannerDependencies {
  createPreviewUrl(file: File): string;
  revokePreviewUrl(url: string): void;
  load(file: File, signal: AbortSignal): Promise<ScannerSource>;
  detect(
    source: ScannerSource,
    signal: AbortSignal,
  ): Promise<ReceiptPolygon | undefined>;
  correct(
    source: ScannerSource,
    polygon: ReceiptPolygon,
    signal: AbortSignal,
  ): Promise<CorrectedSource>;
  runOcr(
    input: AdaptiveOcrInput,
    callbacks: AdaptiveOcrCallbacks,
  ): Promise<AdaptiveOcrResult>;
}

async function loadBoundedSource(file: File, signal: AbortSignal): Promise<ScannerSource> {
  const bitmap = await loadReceiptImage(file, signal);
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const size = calculateWorkingSize(bitmap.width, bitmap.height, memory);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Canvas 2D tidak tersedia pada browser ini.");
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return canvas;
}

const defaultDependencies: ReceiptScannerDependencies = {
  createPreviewUrl: (file) => URL.createObjectURL(file),
  revokePreviewUrl: (url) => URL.revokeObjectURL(url),
  load: loadBoundedSource,
  detect: detectReceiptPolygon,
  correct: correctPerspective,
  runOcr: runAdaptiveOcr,
};

const initialProgress: ScanProgress = {
  stage: "loading-image",
  progress: 0,
  pass: 0,
  totalPasses: 0,
  elapsedMs: 0,
};

export function useReceiptScanner(
  dependencies: ReceiptScannerDependencies = defaultDependencies,
) {
  const [status, setStatus] = useState<ReceiptScannerStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [polygon, setPolygon] = useState<ReceiptPolygon>();
  const [originalPolygon, setOriginalPolygon] = useState<ReceiptPolygon>();
  const [rotation, setRotation] = useState<RightAngle>(0);
  const [progress, setProgress] = useState<ScanProgress>(initialProgress);
  const [alternatives, setAlternatives] = useState<ScoredOcrCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [error, setError] = useState("");
  const source = useRef<ScannerSource | undefined>(undefined);
  const controller = useRef<AbortController | undefined>(undefined);
  const preview = useRef("");
  const scanId = useRef(0);

  const cleanupSource = useCallback(() => {
    source.current?.close?.();
    source.current = undefined;
    if (preview.current) {
      dependencies.revokePreviewUrl(preview.current);
      preview.current = "";
    }
  }, [dependencies]);

  useEffect(
    () => () => {
      scanId.current += 1;
      controller.current?.abort();
      cleanupSource();
    },
    [cleanupSource],
  );

  const selectFile = useCallback(
    async (file: File) => {
      const operation = ++scanId.current;
      controller.current?.abort();
      cleanupSource();
      const aborter = new AbortController();
      controller.current = aborter;
      const nextPreview = dependencies.createPreviewUrl(file);
      preview.current = nextPreview;
      setPreviewUrl(nextPreview);
      setFileName(file.name);
      setStatus("processing");
      setError("");
      setAlternatives([]);
      setProgress({ ...initialProgress, stage: "loading-image" });
      try {
        const loaded = await dependencies.load(file, aborter.signal);
        if (operation !== scanId.current) {
          loaded.close?.();
          return;
        }
        source.current = loaded;
        setImageSize({ width: loaded.width, height: loaded.height });
        setProgress({
          ...initialProgress,
          stage: "detecting-receipt",
          progress: 0.2,
        });
        const detected = await dependencies.detect(loaded, aborter.signal);
        if (operation !== scanId.current) return;
        const nextPolygon =
          detected ?? createFullImagePolygon(loaded.width, loaded.height);
        setPolygon(nextPolygon);
        setOriginalPolygon(nextPolygon);
        setRotation(0);
        setStatus("editing");
      } catch (cause) {
        if (operation !== scanId.current) return;
        if ((cause as Error).name === "AbortError") setStatus("idle");
        else {
          setError("Gambar tidak dapat disiapkan. Coba foto lain atau format JPG/PNG.");
          setStatus("failed");
        }
      }
    },
    [cleanupSource, dependencies],
  );

  const scan = useCallback(async () => {
    if (!source.current || !polygon) return;
    const operation = ++scanId.current;
    controller.current?.abort();
    const aborter = new AbortController();
    controller.current = aborter;
    setStatus("processing");
    setError("");
    setProgress({
      ...initialProgress,
      stage: "correcting-perspective",
      progress: 0.25,
    });
    let cleanup: () => void = () => undefined;
    try {
      let scanSource: ScannerSource = source.current;
      if (polygon.source !== "full-image") {
        try {
          const corrected = await dependencies.correct(
            source.current,
            polygon,
            aborter.signal,
          );
          scanSource = corrected.canvas;
          cleanup = corrected.cleanup;
        } catch (cause) {
          if ((cause as Error).name === "AbortError") throw cause;
        }
      }
      const output = await dependencies.runOcr(
        {
          source: scanSource,
          preferredOrientation: rotation,
          lowMemory:
            ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4) <= 2,
          interpret: (candidate) => reconcileReceipt(interpretReceipt(candidate)),
        },
        {
          signal: aborter.signal,
          onProgress: (nextProgress) => {
            if (operation === scanId.current) setProgress(nextProgress);
          },
        },
      );
      if (operation !== scanId.current) return;
      const nextAlternatives =
        output.alternatives.length > 0
          ? output.alternatives
          : [{ candidate: output.best, interpreted: output.interpreted, score: 1 }];
      setAlternatives(nextAlternatives);
      setSelectedCandidateId(output.best.id);
      setStatus("review");
    } catch (cause) {
      if (operation !== scanId.current) return;
      if ((cause as Error).name === "AbortError") setStatus("editing");
      else {
        setError(
          "Scan belum menghasilkan item yang meyakinkan. Atur area struk atau isi item manual.",
        );
        setStatus("failed");
      }
    } finally {
      cleanup();
    }
  }, [dependencies, polygon, rotation]);

  const cancel = useCallback(() => {
    scanId.current += 1;
    controller.current?.abort();
    setStatus(source.current ? "editing" : "idle");
  }, []);

  const redetect = useCallback(async () => {
    if (!source.current) return;
    const aborter = new AbortController();
    controller.current?.abort();
    controller.current = aborter;
    const detected = await dependencies.detect(source.current, aborter.signal);
    if (detected) {
      setPolygon(detected);
      setOriginalPolygon(detected);
    }
  }, [dependencies]);

  const selected = alternatives.find(
    (alternative) => alternative.candidate.id === selectedCandidateId,
  );

  return {
    status,
    previewUrl,
    fileName,
    imageSize,
    polygon,
    originalPolygon,
    rotation,
    progress,
    alternatives,
    selected,
    error,
    selectFile,
    scan,
    cancel,
    redetect,
    setPolygon,
    setRotation,
    resetPolygon: () => originalPolygon && setPolygon(originalPolygon),
    selectCandidate: setSelectedCandidateId,
    edit: () => setStatus("editing"),
  };
}

export type ReceiptScannerController = ReturnType<typeof useReceiptScanner>;
