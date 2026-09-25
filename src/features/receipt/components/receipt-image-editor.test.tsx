import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ReceiptPolygon } from "../scan-types";
import { ReceiptImageEditor } from "./receipt-image-editor";

const automatic: ReceiptPolygon = {
  topLeft: { x: 100, y: 120 },
  topRight: { x: 1100, y: 100 },
  bottomRight: { x: 1080, y: 1500 },
  bottomLeft: { x: 120, y: 1480 },
  confidence: 0.86,
  source: "automatic",
};

describe("ReceiptImageEditor", () => {
  it("rotates, resets, and confirms the controlled polygon", () => {
    const onPolygonChange = vi.fn();
    const onRotate = vi.fn();
    const onReset = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ReceiptImageEditor
        previewUrl="/receipt.jpg"
        imageSize={{ width: 1200, height: 1600 }}
        polygon={automatic}
        originalPolygon={automatic}
        rotation={0}
        onPolygonChange={onPolygonChange}
        onRotate={onRotate}
        onReset={onReset}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Putar kanan" }));
    expect(onRotate).toHaveBeenCalledWith(90);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onPolygonChange).toHaveBeenCalledWith(automatic);
    expect(onReset).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Scan" }));
    expect(onConfirm).toHaveBeenCalledWith(automatic);
  });

  it("exposes every corner and keeps keyboard movement inside image bounds", () => {
    const onPolygonChange = vi.fn();
    render(
      <ReceiptImageEditor
        previewUrl="/receipt.jpg"
        imageSize={{ width: 1200, height: 1600 }}
        polygon={{ ...automatic, topLeft: { x: 0, y: 0 } }}
        originalPolygon={automatic}
        rotation={0}
        onPolygonChange={onPolygonChange}
        onRotate={() => undefined}
        onReset={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(
      screen.getByRole("slider", { name: "Sudut kiri atas" }),
    ).toBeVisible();
    expect(
      screen.getByRole("slider", { name: "Sudut kanan atas" }),
    ).toBeVisible();
    expect(
      screen.getByRole("slider", { name: "Sudut kanan bawah" }),
    ).toBeVisible();
    expect(
      screen.getByRole("slider", { name: "Sudut kiri bawah" }),
    ).toBeVisible();

    fireEvent.keyDown(screen.getByRole("slider", { name: "Sudut kiri atas" }), {
      key: "ArrowLeft",
    });
    expect(onPolygonChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ topLeft: { x: 0, y: 0 }, source: "manual" }),
    );
    fireEvent.keyDown(screen.getByRole("slider", { name: "Sudut kiri atas" }), {
      key: "ArrowRight",
    });
    expect(onPolygonChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ topLeft: { x: 10, y: 0 }, source: "manual" }),
    );
  });
});
