"use client";

import {
  Crop,
  Maximize,
  RotateCcw,
  RotateCw,
  ScanLine,
  Undo2,
} from "lucide-react";
import { useRef, useState } from "react";

import { createFullImagePolygon } from "../scan-types";
import type { Point, ReceiptPolygon, RightAngle } from "../scan-types";

type Corner = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";

const cornerLabels: Record<Corner, string> = {
  topLeft: "Sudut kiri atas",
  topRight: "Sudut kanan atas",
  bottomRight: "Sudut kanan bawah",
  bottomLeft: "Sudut kiri bawah",
};

interface ReceiptImageEditorProps {
  previewUrl: string;
  imageSize: { width: number; height: number };
  polygon: ReceiptPolygon;
  originalPolygon: ReceiptPolygon;
  rotation: RightAngle;
  onPolygonChange: (polygon: ReceiptPolygon) => void;
  onRotate: (rotation: RightAngle) => void;
  onReset: () => void;
  onConfirm: (polygon: ReceiptPolygon) => void;
  onAutoCrop?: () => void;
}

function clamp(value: number, maximum: number): number {
  return Math.min(maximum, Math.max(0, value));
}

function rotate(rotation: RightAngle, delta: 90 | -90): RightAngle {
  return ((rotation + delta + 360) % 360) as RightAngle;
}

function rotationTransform(
  rotation: RightAngle,
  width: number,
  height: number,
): string {
  if (rotation === 90) return `matrix(0 1 -1 0 ${height} 0)`;
  if (rotation === 180) return `matrix(-1 0 0 -1 ${width} ${height})`;
  if (rotation === 270) return `matrix(0 -1 1 0 0 ${width})`;
  return "matrix(1 0 0 1 0 0)";
}

export function ReceiptImageEditor({
  previewUrl,
  imageSize,
  polygon,
  originalPolygon,
  rotation,
  onPolygonChange,
  onRotate,
  onReset,
  onConfirm,
  onAutoCrop,
}: ReceiptImageEditorProps) {
  const overlay = useRef<SVGSVGElement>(null);
  const [activeCorner, setActiveCorner] = useState<Corner>();
  const corners: Corner[] = [
    "topLeft",
    "topRight",
    "bottomRight",
    "bottomLeft",
  ];

  function updateCorner(corner: Corner, point: Point) {
    onPolygonChange({
      ...polygon,
      [corner]: {
        x: clamp(Math.round(point.x), imageSize.width),
        y: clamp(Math.round(point.y), imageSize.height),
      },
      confidence: Math.min(polygon.confidence, 0.8),
      source: "manual",
    });
  }

  function pointFromPointer(
    clientX: number,
    clientY: number,
  ): Point | undefined {
    const bounds = overlay.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0 || bounds.height === 0) return undefined;
    const displayWidth =
      rotation === 90 || rotation === 270 ? imageSize.height : imageSize.width;
    const displayHeight =
      rotation === 90 || rotation === 270 ? imageSize.width : imageSize.height;
    const displayX = ((clientX - bounds.left) / bounds.width) * displayWidth;
    const displayY = ((clientY - bounds.top) / bounds.height) * displayHeight;
    if (rotation === 90) return { x: displayY, y: imageSize.height - displayX };
    if (rotation === 180) {
      return { x: imageSize.width - displayX, y: imageSize.height - displayY };
    }
    if (rotation === 270) return { x: imageSize.width - displayY, y: displayX };
    return { x: displayX, y: displayY };
  }

  function moveWithKeyboard(corner: Corner, key: string) {
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -10, y: 0 },
      ArrowRight: { x: 10, y: 0 },
      ArrowUp: { x: 0, y: -10 },
      ArrowDown: { x: 0, y: 10 },
    };
    const movement = delta[key];
    if (!movement) return;
    updateCorner(corner, {
      x: polygon[corner].x + movement.x,
      y: polygon[corner].y + movement.y,
    });
  }

  const polygonPoints = corners
    .map((corner) => `${polygon[corner].x},${polygon[corner].y}`)
    .join(" ");
  const displayWidth =
    rotation === 90 || rotation === 270 ? imageSize.height : imageSize.width;
  const displayHeight =
    rotation === 90 || rotation === 270 ? imageSize.width : imageSize.height;

  return (
    <div className="space-y-4">
      <div className="grid place-items-center overflow-hidden rounded-2xl bg-slate-950">
        <svg
          ref={overlay}
          viewBox={`0 0 ${displayWidth} ${displayHeight}`}
          width={displayWidth}
          height={displayHeight}
          aria-label="Pratinjau area struk"
          className="block max-h-[32rem] max-w-full touch-none"
          onPointerMove={(event) => {
            if (!activeCorner) return;
            const point = pointFromPointer(event.clientX, event.clientY);
            if (point) updateCorner(activeCorner, point);
          }}
          onPointerUp={() => setActiveCorner(undefined)}
          onPointerCancel={() => setActiveCorner(undefined)}
        >
          <g
            transform={rotationTransform(
              rotation,
              imageSize.width,
              imageSize.height,
            )}
          >
            <image
              href={previewUrl}
              width={imageSize.width}
              height={imageSize.height}
              preserveAspectRatio="none"
            />
            <polygon
              points={polygonPoints}
              fill="rgba(37, 99, 235, .16)"
              stroke="var(--brand-500)"
              strokeWidth={Math.max(4, imageSize.width / 220)}
            />
            {corners.map((corner) => (
              <circle
                key={corner}
                role="slider"
                aria-label={cornerLabels[corner]}
                aria-valuemin={0}
                aria-valuemax={Math.max(imageSize.width, imageSize.height)}
                aria-valuenow={Math.round(
                  (polygon[corner].x + polygon[corner].y) / 2,
                )}
                tabIndex={0}
                cx={polygon[corner].x}
                cy={polygon[corner].y}
                r={Math.max(18, imageSize.width / 45)}
                fill="white"
                stroke="var(--brand-500)"
                strokeWidth={Math.max(5, imageSize.width / 180)}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setActiveCorner(corner);
                }}
                onKeyDown={(event) => {
                  if (event.key.startsWith("Arrow")) event.preventDefault();
                  moveWithKeyboard(corner, event.key);
                }}
              />
            ))}
          </g>
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <EditorButton
          label="Putar kiri"
          onClick={() => onRotate(rotate(rotation, -90))}
        >
          <RotateCcw size={17} />
        </EditorButton>
        <EditorButton
          label="Putar kanan"
          onClick={() => onRotate(rotate(rotation, 90))}
        >
          <RotateCw size={17} />
        </EditorButton>
        <EditorButton label="Auto Crop" onClick={() => onAutoCrop?.()}>
          <Crop size={17} />
        </EditorButton>
        <EditorButton
          label="Full Image"
          onClick={() =>
            onPolygonChange(
              createFullImagePolygon(imageSize.width, imageSize.height),
            )
          }
        >
          <Maximize size={17} />
        </EditorButton>
        <EditorButton
          label="Reset"
          onClick={() => {
            onPolygonChange(originalPolygon);
            onReset();
          }}
        >
          <Undo2 size={17} />
        </EditorButton>
        <EditorButton label="Scan" primary onClick={() => onConfirm(polygon)}>
          <ScanLine size={17} />
        </EditorButton>
      </div>
    </div>
  );
}

function EditorButton({
  label,
  onClick,
  primary = false,
  children,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 font-bold ${
        primary
          ? "bg-[var(--brand-500)] text-white"
          : "border border-[var(--surface-border)] bg-white"
      }`}
    >
      {children}
      {label}
    </button>
  );
}
