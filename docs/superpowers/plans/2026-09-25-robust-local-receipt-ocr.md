# Robust Local Receipt OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free, browser-only adaptive receipt scanner that corrects image geometry, runs multiple local OCR passes, interprets varied receipt layouts, and visibly reconciles results against receipt totals.

**Architecture:** The scan flow becomes a staged pipeline: decode and normalize the image, detect or manually correct the receipt polygon, generate bounded preprocessing variants, run a reusable Tesseract worker, score and interpret candidates, then reconcile totals before review. OpenCV.js and Tesseract stay lazy-loaded, all image data remains in the browser, and the existing manual editor and Split Bill handoff remain the final safety net.

**Tech Stack:** Next.js 16, React 19, TypeScript, Canvas/ImageBitmap APIs, `@techstark/opencv-js@5.0.0-release.1`, Tesseract.js 7, Vitest, Testing Library, IndexedDB/Dexie.

**Spec:** `docs/superpowers/specs/2026-09-24-robust-local-receipt-ocr-design.md`

## Global Constraints

- Receipt pixels and OCR text must never be sent to an OCR API or analytics endpoint.
- OpenCV.js, Tesseract worker assets, WASM, and `ind+eng` language data must be lazy-loaded and served from application-controlled assets.
- Processing may take 10 seconds to 5 minutes, but it must show real stages and remain cancellable.
- Automatic processing is the default; manual rotation, crop, and four-corner perspective correction are required fallbacks.
- Estimated or low-confidence values must remain visible and editable; ambiguous values must not be silently invented.
- Existing upload validation, manual editor, IndexedDB draft persistence, and Scan-to-Split-Bill handoff must continue to work.
- Numeric values entering Split Bill must remain positive safe integers.
- Do not add a server route, paid service, account requirement, premium control, or placeholder action.

## Review Focus

- Very large portrait images on low-memory mobile devices must be resized before variants are allocated; Task 2 pins the resolution budget and cleanup behavior.
- A subtotal that includes discounts, tax, or service must not turn the whole difference into a fake item; Task 6 tests ambiguous reconciliation.
- Several unpriced trailing names before a subtotal must produce an issue instead of a guessed item; Task 6 tests multiple unresolved rows.
- EXIF-rotated images and receipts photographed upside-down must enter the correct orientation candidate order; Tasks 2 and 4 test orientation handling.
- Cancellation during OpenCV preprocessing or Tesseract recognition must release matrices, bitmaps, listeners, and workers; Tasks 3, 4, and 8 test abort cleanup.

---

### Task 1: OCR Domain Contracts and Local Runtime Dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Create: `src/features/receipt/scan-types.ts`
- Create: `src/features/receipt/scan-types.test.ts`
- Modify: `src/features/receipt/types.ts`

**Interfaces:**
- Consumes: existing `ParsedReceiptItem` and `OcrCallbacks` from `src/features/receipt/types.ts`.
- Produces: `Point`, `ReceiptPolygon`, `PreprocessingMode`, `OcrLine`, `OcrCandidate`, `ReceiptIssue`, `InterpretedReceipt`, `ScanStage`, and `ScanProgress`.

- [ ] **Step 1: Write the failing contract test**

```ts
import { describe, expect, it } from "vitest";
import { clampConfidence, createFullImagePolygon } from "./scan-types";

describe("receipt scan contracts", () => {
  it("creates a bounded full-image fallback polygon", () => {
    expect(createFullImagePolygon(1200, 1600)).toEqual({
      topLeft: { x: 0, y: 0 },
      topRight: { x: 1200, y: 0 },
      bottomRight: { x: 1200, y: 1600 },
      bottomLeft: { x: 0, y: 1600 },
      confidence: 0,
      source: "full-image",
    });
    expect(clampConfidence(1.4)).toBe(1);
    expect(clampConfidence(-0.2)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/features/receipt/scan-types.test.ts`

Expected: FAIL because `scan-types.ts` does not exist.

- [ ] **Step 3: Install and define the contracts**

Run: `npm install @techstark/opencv-js@5.0.0-release.1 @tesseract.js-data/eng@1.0.0 @tesseract.js-data/ind@1.0.0`

Implement these public shapes in `scan-types.ts`:

```ts
export type RightAngle = 0 | 90 | 180 | 270;
export type PolygonSource = "automatic" | "manual" | "full-image";
export type PreprocessingMode =
  | "original"
  | "grayscale"
  | "contrast"
  | "adaptive-threshold"
  | "otsu"
  | "sharpen";
export type ScanStage =
  | "loading-image"
  | "detecting-receipt"
  | "correcting-perspective"
  | "preparing-variant"
  | "recognizing-text"
  | "interpreting-layout"
  | "reconciling-totals";

export interface Point { x: number; y: number }
export interface ReceiptPolygon {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
  confidence: number;
  source: PolygonSource;
}
export interface OcrLine {
  text: string;
  confidence: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
}
export interface OcrCandidate {
  id: string;
  rawText: string;
  lines: OcrLine[];
  engineConfidence: number;
  orientation: RightAngle;
  preprocessing: PreprocessingMode;
  durationMs: number;
}
export interface ReceiptIssue {
  code: "low-confidence" | "total-mismatch" | "ambiguous-gap" | "missing-subtotal";
  message: string;
}
export interface InterpretedReceipt {
  items: ParsedReceiptItem[];
  subtotal?: number;
  tax?: number;
  serviceCharge?: number;
  grandTotal?: number;
  confidence: number;
  issues: ReceiptIssue[];
  sourceCandidateId: string;
}
```

Add `confidence?: number` and `source?: "ocr" | "estimated" | "manual"` to `ParsedReceiptItem`, retaining the existing optional `estimated` field for compatibility.

Add `*.traineddata` and local worker cache paths to `.gitignore`, but do not ignore `public/ocr/` because deployment assets must be committed.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/features/receipt/scan-types.test.ts src/features/receipt/parser.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore src/features/receipt/scan-types.ts src/features/receipt/scan-types.test.ts src/features/receipt/types.ts
git commit -m "feat: define adaptive receipt scan contracts"
```

---

### Task 2: Safe Image Loading, Resolution Budget, and Canvas Variants

**Files:**
- Create: `src/features/receipt/image-loader.ts`
- Create: `src/features/receipt/image-loader.test.ts`
- Create: `src/features/receipt/image-variants.ts`
- Create: `src/features/receipt/image-variants.test.ts`

**Interfaces:**
- Consumes: `RightAngle` and `PreprocessingMode` from Task 1.
- Produces: `calculateWorkingSize(width, height, deviceMemory?)`, `loadReceiptImage(file, signal)`, `rotateDimensions(width, height, angle)`, `variantPlan(input)`, and `renderVariant(source, options, signal)`.

- [ ] **Step 1: Write failing pure-behavior tests**

```ts
expect(calculateWorkingSize(6000, 8000, 2)).toEqual({ width: 1500, height: 2000 });
expect(calculateWorkingSize(1200, 1600, 8)).toEqual({ width: 1200, height: 1600 });
expect(rotateDimensions(1200, 1600, 90)).toEqual({ width: 1600, height: 1200 });
expect(variantPlan({ lowMemory: true, needsMorePasses: true })).toEqual([
  "grayscale",
  "adaptive-threshold",
]);
expect(variantPlan({ lowMemory: false, needsMorePasses: true })).toEqual([
  "grayscale",
  "contrast",
  "adaptive-threshold",
  "otsu",
  "sharpen",
]);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/receipt/image-loader.test.ts src/features/receipt/image-variants.test.ts`

Expected: FAIL because the modules are missing.

- [ ] **Step 3: Implement image loading and bounded sizing**

`calculateWorkingSize` must preserve aspect ratio, cap the long edge at 2000px for devices reporting at most 2GB, and at 3000px otherwise. `loadReceiptImage` must use `createImageBitmap(file, { imageOrientation: "from-image" })`, check `signal.aborted` before and after decode, and call `bitmap.close()` when an abort occurs after allocation.

`renderVariant` must allocate one canvas at a time, apply rotation before filters, return `canvas.transferToImageBitmap()` when supported, and otherwise return the canvas. Every call must check the abort signal between expensive stages.

- [ ] **Step 4: Add the Review Focus cleanup test**

Inject a `decode` function into `loadReceiptImage`. Return a fake closeable bitmap, abort immediately after decode, and assert that `close()` is called once and an `AbortError` is thrown.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- src/features/receipt/image-loader.test.ts src/features/receipt/image-variants.test.ts`

Expected: PASS.

```bash
git add src/features/receipt/image-loader.ts src/features/receipt/image-loader.test.ts src/features/receipt/image-variants.ts src/features/receipt/image-variants.test.ts
git commit -m "feat: add bounded receipt image preprocessing"
```

---

### Task 3: OpenCV Loader, Polygon Ranking, and Perspective Transform

**Files:**
- Create: `src/features/receipt/opencv-loader.ts`
- Create: `src/features/receipt/document-detector.ts`
- Create: `src/features/receipt/document-detector.test.ts`
- Create: `src/features/receipt/perspective.ts`
- Create: `src/features/receipt/perspective.test.ts`

**Interfaces:**
- Consumes: `ReceiptPolygon`, `Point`, and loaded image/canvas from Tasks 1–2.
- Produces: `loadOpenCv()`, `orderPolygon(points)`, `scoreReceiptPolygon(points, imageSize)`, `detectReceiptPolygon(source, signal)`, and `correctPerspective(source, polygon, signal)`.

- [ ] **Step 1: Write failing geometry tests with literal expectations**

```ts
expect(orderPolygon([
  { x: 900, y: 1400 }, { x: 100, y: 100 },
  { x: 950, y: 120 }, { x: 80, y: 1450 },
])).toEqual({
  topLeft: { x: 100, y: 100 },
  topRight: { x: 950, y: 120 },
  bottomRight: { x: 900, y: 1400 },
  bottomLeft: { x: 80, y: 1450 },
});
expect(scoreReceiptPolygon(
  [{ x: 100, y: 80 }, { x: 900, y: 80 }, { x: 900, y: 1500 }, { x: 100, y: 1500 }],
  { width: 1000, height: 1600 },
)).toBeGreaterThan(0.8);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/receipt/document-detector.test.ts src/features/receipt/perspective.test.ts`

Expected: FAIL because geometry functions are missing.

- [ ] **Step 3: Implement lazy OpenCV loading and detection**

`loadOpenCv()` must dynamic-import `@techstark/opencv-js`, cache the initialization promise, and reject with a typed `OpenCvUnavailableError` without preventing Canvas fallback.

`detectReceiptPolygon` must grayscale, blur, edge/threshold, find external contours, approximate polygons, retain convex four-point candidates, score them, and return the best candidate only when its score is at least `0.6`. Use `try/finally` and delete every `cv.Mat`, `MatVector`, and temporary object in reverse allocation order.

`correctPerspective` must calculate destination width/height from opposing edges, use `cv.getPerspectiveTransform` and `cv.warpPerspective`, and return a canvas plus cleanup callback.

- [ ] **Step 4: Test unavailable OpenCV and cleanup**

Inject the OpenCV boundary into `detectReceiptPolygon`. Make the loader reject and assert the caller receives `undefined` rather than a failed scan. In a second test, abort after contour allocation and assert all fake matrices receive `delete()` exactly once; assertions target resource side effects, not mocked return values.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- src/features/receipt/document-detector.test.ts src/features/receipt/perspective.test.ts`

Expected: PASS.

```bash
git add src/features/receipt/opencv-loader.ts src/features/receipt/document-detector.ts src/features/receipt/document-detector.test.ts src/features/receipt/perspective.ts src/features/receipt/perspective.test.ts
git commit -m "feat: detect and flatten receipt geometry"
```

---

### Task 4: Adaptive OCR Candidate Orchestration

**Files:**
- Modify: `src/features/receipt/ocr-adapter.ts`
- Modify: `package.json`
- Create: `scripts/sync-ocr-assets.mjs`
- Create: `src/features/receipt/ocr-orchestrator.ts`
- Create: `src/features/receipt/ocr-orchestrator.test.ts`
- Create: `src/features/receipt/candidate-scorer.ts`
- Create: `src/features/receipt/candidate-scorer.test.ts`
- Create: `public/ocr/README.md`

**Interfaces:**
- Consumes: variant renderer from Task 2 and OCR contracts from Task 1.
- Produces: `scoreCandidate(candidate, interpreted)`, `shouldStopScanning(score, interpreted)`, and `runAdaptiveOcr(input, callbacks)`.

- [ ] **Step 1: Write failing scoring and orchestration tests**

Use hand-derived candidates. Assert that a candidate with eight coherent items and exact Rp214.000 reconciliation scores above one with seven items and a Rp17.000 mismatch. Assert that an exact high-confidence candidate stops after the first recognizer call, while a mismatch continues to the next orientation. Assert orientation order `[0, 90, 180, 270]` when orientation is unknown and `[90, 0, 180, 270]` when orientation detection prefers 90 degrees.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/receipt/candidate-scorer.test.ts src/features/receipt/ocr-orchestrator.test.ts`

Expected: FAIL because scorer and orchestrator do not exist.

- [ ] **Step 3: Create reproducible same-origin OCR assets**

Add an `ocr:assets` package script that runs `node scripts/sync-ocr-assets.mjs`. The script must empty only `public/ocr/runtime` and recreate it, then copy:

```js
const assets = [
  ["node_modules/tesseract.js/dist/worker.min.js", "public/ocr/runtime/worker.min.js"],
  ["node_modules/@tesseract.js-data/eng/4.0.0_fast/eng.traineddata.gz", "public/ocr/runtime/lang/eng.traineddata.gz"],
  ["node_modules/@tesseract.js-data/ind/4.0.0_fast/ind.traineddata.gz", "public/ocr/runtime/lang/ind.traineddata.gz"],
];
```

Copy every `tesseract-core*.js`, `tesseract-core*.wasm`, and `tesseract-core*.wasm.js` file from `node_modules/tesseract.js-core` into `public/ocr/runtime/core`. Fail with a named missing-source error when any required worker or language file does not exist. Run `npm run ocr:assets` and document source package versions and generated destinations in `public/ocr/README.md`.

- [ ] **Step 4: Extend the adapter and implement adaptive passes**

Refactor `recognizeReceipt` so a worker is created once per scan and reused across candidates. Configure local application paths when the files exist:

```ts
const worker = await createWorker(["ind", "eng"], 1, {
  workerPath: "/ocr/runtime/worker.min.js",
  corePath: "/ocr/runtime/core",
  langPath: "/ocr/runtime/lang",
  logger,
});
```

`runAdaptiveOcr` must:

1. render and recognize the highest-ranked orientation/grayscale pass;
2. interpret and score it;
3. stop only for high confidence plus reconciled subtotal;
4. otherwise run bounded variants and rotations sequentially;
5. retain the three materially different highest scores;
6. terminate the worker in `finally`.

- [ ] **Step 5: Test cancellation and pass budget**

Inject a recognizer that waits on a promise. Abort it, assert an `AbortError`, worker termination, no subsequent variants, and final stage cleanup. Add a low-memory input test that never exceeds two preprocessing modes per orientation.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm test -- src/features/receipt/candidate-scorer.test.ts src/features/receipt/ocr-orchestrator.test.ts`

Expected: PASS.

```bash
git add package.json package-lock.json scripts/sync-ocr-assets.mjs src/features/receipt/ocr-adapter.ts src/features/receipt/ocr-orchestrator.ts src/features/receipt/ocr-orchestrator.test.ts src/features/receipt/candidate-scorer.ts src/features/receipt/candidate-scorer.test.ts public/ocr
git commit -m "feat: orchestrate adaptive local receipt OCR"
```

---

### Task 5: Layout-Aware Money and Receipt Interpretation

**Files:**
- Create: `src/features/receipt/money-normalizer.ts`
- Create: `src/features/receipt/money-normalizer.test.ts`
- Create: `src/features/receipt/layout-grouper.ts`
- Create: `src/features/receipt/layout-grouper.test.ts`
- Create: `src/features/receipt/receipt-interpreter.ts`
- Create: `src/features/receipt/receipt-interpreter.test.ts`
- Modify: `src/features/receipt/parser.ts`
- Modify: `src/features/receipt/parser.test.ts`

**Interfaces:**
- Consumes: `OcrCandidate`, `OcrLine`, and `ParsedReceiptItem`.
- Produces: `normalizeMoneyToken(text, numericContext)`, `groupWordsIntoRows(words)`, and `interpretReceipt(candidate)`.

- [ ] **Step 1: Write failing money and layout tests**

Test literal conversions: `Rp 17.000 → 17000`, `36. 000 → 36000`, `42,000 → 42000`, `I7.OOO → 17000` only in numeric context, and reject `17.00.0`. Test bounding boxes that form item, quantity, unit-price, and total columns even when OCR returns words out of order.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/receipt/money-normalizer.test.ts src/features/receipt/layout-grouper.test.ts src/features/receipt/receipt-interpreter.test.ts`

Expected: FAIL because the modules are missing.

- [ ] **Step 3: Implement normalization and row grouping**

Group words whose vertical centers overlap by at least 50% of the smaller box height, then sort rows by `y0` and words by `x0`. Apply `O→0`, `I/l→1`, and `S→5` substitutions only after a token is classified as a price/quantity candidate; never mutate item names globally.

- [ ] **Step 4: Implement interpreters for supported layouts**

Implement ordered strategies for:

1. aligned item/quantity/unit/total columns;
2. `unit × quantity total` detail rows using up to two preceding name rows;
3. `quantity name price` and `name quantity price` rows;
4. `name price` rows;
5. existing plain-text fallback through `parseReceiptText`.

Classify subtotal, total, tax, service, tip, discount, and payment lines before item extraction. Merge duplicate strategy results by normalized name, amount, quantity, and overlapping bounding boxes.

- [ ] **Step 5: Add multi-format regression fixtures**

In `receipt-interpreter.test.ts`, add literal OCR line fixtures for a minimarket table, restaurant multiline receipt, café `price × quantity`, rotated word ordering, discount row, and the text extracted from `kerja nyata.jpeg`. Expected arrays must be hand-authored and include provenance/confidence.

- [ ] **Step 6: Run tests and commit**

Run: `npm test -- src/features/receipt/money-normalizer.test.ts src/features/receipt/layout-grouper.test.ts src/features/receipt/receipt-interpreter.test.ts src/features/receipt/parser.test.ts`

Expected: PASS, including existing parser behavior.

```bash
git add src/features/receipt/money-normalizer.ts src/features/receipt/money-normalizer.test.ts src/features/receipt/layout-grouper.ts src/features/receipt/layout-grouper.test.ts src/features/receipt/receipt-interpreter.ts src/features/receipt/receipt-interpreter.test.ts src/features/receipt/parser.ts src/features/receipt/parser.test.ts
git commit -m "feat: interpret varied receipt layouts"
```

---

### Task 6: Conservative Total Reconciliation

**Files:**
- Create: `src/features/receipt/receipt-reconciler.ts`
- Create: `src/features/receipt/receipt-reconciler.test.ts`
- Modify: `src/features/receipt/parser.ts`
- Modify: `src/features/receipt/parser.test.ts`

**Interfaces:**
- Consumes: interpreted item candidates and detected subtotal/tax/service/discount rows.
- Produces: `reconcileReceipt(receipt): InterpretedReceipt` with explicit issues and estimated provenance.

- [ ] **Step 1: Write failing reconciliation tests**

Cover these literal cases:

- seven items total Rp197.000, one unresolved `Coffee Latte ICE LARGE`, subtotal Rp214.000 → one estimated Rp17.000 item;
- two unresolved names and Rp34.000 difference → no inferred items plus `ambiguous-gap`;
- Rp197.000 items, Rp10.000 discount, Rp207.000 subtotal → discount remains a separate adjustment, not an item;
- item sum already equals subtotal → no issue;
- subtotal lower than item sum → `total-mismatch`, never a negative item;
- arithmetic beyond `Number.MAX_SAFE_INTEGER` → reject the candidate.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/receipt/receipt-reconciler.test.ts`

Expected: FAIL because `reconcileReceipt` does not exist.

- [ ] **Step 3: Extract reconciliation from the parser**

Move subtotal-difference logic out of `parser.ts`. The reconciler may infer only when `unresolvedItems.length === 1`, no unaccounted adjustment exists, and the positive difference is a safe integer. Return `source: "estimated"`, `estimated: true`, confidence at most `0.45`, and a visible `total-mismatch` or `ambiguous-gap` issue whenever arithmetic is not exact.

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- src/features/receipt/receipt-reconciler.test.ts src/features/receipt/parser.test.ts src/features/receipt/receipt-interpreter.test.ts`

Expected: PASS.

```bash
git add src/features/receipt/receipt-reconciler.ts src/features/receipt/receipt-reconciler.test.ts src/features/receipt/parser.ts src/features/receipt/parser.test.ts
git commit -m "feat: reconcile receipt totals conservatively"
```

---

### Task 7: Accessible Image Geometry Editor

**Files:**
- Create: `src/features/receipt/components/receipt-image-editor.tsx`
- Create: `src/features/receipt/components/receipt-image-editor.test.tsx`
- Create: `src/features/receipt/components/receipt-progress.tsx`
- Create: `src/features/receipt/components/receipt-progress.test.tsx`

**Interfaces:**
- Consumes: `ReceiptPolygon`, rotation angle, preview URL, and `ScanProgress`.
- Produces: controlled editor callbacks `onPolygonChange`, `onRotate`, `onReset`, `onConfirm`, and a cancellable progress view.

- [ ] **Step 1: Write failing component tests**

Render the editor with a 1200×1600 image and automatic polygon. Assert Rotate Right emits 90, Reset restores the original polygon, Confirm emits the currently edited polygon, each corner has an accessible slider/button label, and keyboard arrows move the focused corner within image bounds. Render progress and assert the actual stage label, pass `2 dari 8`, elapsed time, and Cancel callback.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/receipt/components/receipt-image-editor.test.tsx src/features/receipt/components/receipt-progress.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement controlled editing**

Use an SVG overlay above the image preview. Convert pointer coordinates from rendered size to source-image coordinates. Clamp every corner to `[0,width] × [0,height]`. Provide visible Rotate Left, Rotate Right, Auto Crop, Full Image, Reset, and Scan controls; every button performs the named action.

`ReceiptProgress` maps every `ScanStage` to Indonesian copy and exposes a real Cancel button. It must use `aria-live="polite"` without announcing every Tesseract percentage tick.

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- src/features/receipt/components/receipt-image-editor.test.tsx src/features/receipt/components/receipt-progress.test.tsx`

Expected: PASS.

```bash
git add src/features/receipt/components/receipt-image-editor.tsx src/features/receipt/components/receipt-image-editor.test.tsx src/features/receipt/components/receipt-progress.tsx src/features/receipt/components/receipt-progress.test.tsx
git commit -m "feat: add receipt geometry correction UI"
```

---

### Task 8: Integrate the Adaptive Pipeline into Scan Struk

**Files:**
- Create: `src/features/receipt/use-receipt-scanner.ts`
- Create: `src/features/receipt/use-receipt-scanner.test.tsx`
- Modify: `src/features/receipt/components/receipt-workspace.tsx`
- Create: `src/features/receipt/components/receipt-workspace.test.tsx`

**Interfaces:**
- Consumes: image loader, detector, perspective correction, variants, adaptive OCR, interpreter, reconciler, editor, and progress components from Tasks 1–7.
- Produces: complete `idle → editing → processing → review/failed` user flow and unchanged item-mode draft handoff.

- [ ] **Step 1: Write the failing hook lifecycle test**

Inject real in-memory stage functions with a deferred recognizer. Assert file selection reaches `editing`, scan progresses through named stages, cancellation aborts the controller and returns to editing with the image intact, retry reuses the corrected polygon, and unmount performs cleanup exactly once.

- [ ] **Step 2: Write the failing workspace behavior test**

Upload a test image, accept automatic crop, start scanning, resolve an interpreted result containing eight items and Rp214.000 subtotal, and assert:

- review shows subtotal, item total, difference Rp0, and eight rows;
- an estimated row displays “Estimasi — mohon periksa”;
- a low-confidence row displays its review indicator;
- selecting an alternate candidate replaces review rows;
- “Lanjut ke Split per Item” persists only selected valid rows and routes to `/split-bill`.

- [ ] **Step 3: Verify RED**

Run: `npm test -- src/features/receipt/use-receipt-scanner.test.tsx src/features/receipt/components/receipt-workspace.test.tsx`

Expected: FAIL because the hook and new workflow do not exist.

- [ ] **Step 4: Implement the state machine hook**

Keep one `AbortController` per scan. The hook owns preview cleanup, bitmap cleanup, polygon state, progress, candidate alternatives, selected interpretation, and errors. State transitions must reject stale async results by comparing a monotonically increasing scan ID before committing state.

- [ ] **Step 5: Refactor the workspace**

Replace the current direct `recognizeReceipt → parseReceiptText` call with the hook. Keep upload, camera input, manual item editing, selection, deletion, and handoff behavior. Add image editor before processing, structured progress during processing, totals/confidence/issues above item rows, rescan controls, and alternative result selection. Any manual edit changes that field's `source` to `manual` and clears its estimated warning.

- [ ] **Step 6: Run focused and existing integration tests**

Run: `npm test -- src/features/receipt/use-receipt-scanner.test.tsx src/features/receipt/components/receipt-workspace.test.tsx src/features/receipt/parser.test.ts src/features/split-bill/components/split-bill-workspace.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/receipt/use-receipt-scanner.ts src/features/receipt/use-receipt-scanner.test.tsx src/features/receipt/components/receipt-workspace.tsx src/features/receipt/components/receipt-workspace.test.tsx
git commit -m "feat: integrate adaptive receipt scanning workflow"
```

---

### Task 9: Cross-Format Regression, Privacy Check, and Production Verification

**Files:**
- Create: `src/features/receipt/fixtures/README.md`
- Create: `src/features/receipt/receipt-regression.test.ts`
- Modify: `.gitignore` only if generated OCR caches appear during verification
- Modify: `.superpowers/sdd/2026-09-24-splitbill-end-to-end/progress.md` for evidence only; this path remains uncommitted because it is ignored

**Interfaces:**
- Consumes: the complete pipeline.
- Produces: release evidence; no new product API.

- [ ] **Step 1: Add deterministic regression cases**

Create text/layout fixtures representing at least six merchants and the image conditions listed in the spec. The test must feed fixed OCR lines to the interpreter and assert literal items/totals/issues. Include upright, 90-degree reordered boxes, perspective-like row drift, uneven token spacing, discount/service rows, multiple missing items, and `kerja nyata.jpeg` OCR output.

- [ ] **Step 2: Run focused regression and full suite**

Run:

```bash
npm test -- src/features/receipt/receipt-regression.test.ts
npm test
```

Expected: focused regression PASS; complete suite PASS with zero unhandled errors or warnings.

- [ ] **Step 3: Run static and production verification**

Run:

```bash
npm run format
npm run format:check
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
```

Expected: formatting clean, lint zero warnings, build succeeds, and production audit reports zero high/critical vulnerabilities.

- [ ] **Step 4: Verify browser privacy and interactions**

Start the production build on an unused local port. In browser DevTools, scan `kerja nyata.jpeg`, one rotated sample, and one skewed/low-light sample. Confirm all network requests are limited to same-origin application/OCR assets and that no request contains image blobs, OCR text, item names, or prices. Confirm cancel, manual corners, rotate, rescan, alternative selection, edit, and Split Bill handoff all work.

- [ ] **Step 5: Commit final regression coverage**

```bash
git add src/features/receipt/fixtures/README.md src/features/receipt/receipt-regression.test.ts .gitignore
git commit -m "test: cover robust local receipt scanning"
```

- [ ] **Step 6: Review and publish only after approval**

Run `git status --short`, `git diff --check HEAD~9..HEAD`, and review the complete commit range. Do not stage the user's untracked PDFs. After explicit publication approval, push `main`, run `vercel --prod --yes`, and smoke-test the returned production URL.
