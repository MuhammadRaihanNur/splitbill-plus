# Robust Local Receipt OCR — Design Specification

Date: 2026-09-24
Status: Proposed for implementation

## Context

SplitBill+ currently runs Tesseract.js once against the uploaded image and parses the returned plain text. This works for clean, upright samples but loses information when a receipt is rotated, photographed at an angle, unevenly lit, visually noisy, or arranged in an unfamiliar layout. The `kerja nyata.jpeg` regression demonstrated both cases: most rows could be recovered after adding a multiline parser, while a final price line disappeared from OCR and had to be reconciled from the subtotal.

The new pipeline must improve general receipt robustness without a paid API and without uploading receipt images to a server. Processing time between 10 seconds and 5 minutes is acceptable when additional passes are required. Automatic processing remains the default, with manual crop, rotation, and perspective correction available for difficult images.

## Goals

- Process receipt images locally in the browser with no paid OCR service.
- Handle upright, rotated, upside-down, skewed, perspective-distorted, unevenly lit, and long receipts when the source text remains visually recoverable.
- Recognize multiple receipt layouts instead of encoding one store-specific format.
- Compare parsed item totals with receipt subtotal and visibly flag uncertainty.
- Keep the interface responsive, cancellable, and recoverable throughout long scans.
- Preserve the existing manual item editor and handoff to Split Bill.
- Add deterministic tests across several image and text layouts.

## Non-goals

- Guarantee recovery from text that is physically cropped, covered, severely blurred, overexposed, or no longer visible in the image.
- Upload receipt images or OCR text to SplitBill+ servers.
- Train a custom machine-learning model.
- Silently invent item names, quantities, or prices when more than one interpretation is plausible.
- Implement merchant-specific templates as the primary recognition strategy.

## Architecture

The receipt feature will use an adaptive local pipeline with seven isolated stages. Each stage has a typed input and output so it can be tested independently and replaced without changing the rest of the flow.

### 1. Image intake

`image-loader.ts` decodes JPEG, PNG, or WebP, applies EXIF orientation, validates dimensions, and produces an `ImageBitmap`. It calculates a safe working resolution based on device memory and canvas limits. The original object URL remains available for preview and manual correction, while processing uses a resized bitmap.

Images are never persisted automatically. Existing file-size validation remains, and decode failures produce an actionable error rather than starting OCR.

### 2. Document detection and perspective correction

`document-detector.ts` lazily loads a locally hosted OpenCV.js build. It converts the working image to grayscale, applies edge detection or thresholding, finds contours, and scores quadrilateral candidates by area, rectangularity, aspect ratio, and distance from the image boundary. The strongest candidate becomes the suggested receipt polygon.

If no candidate reaches the confidence threshold, the pipeline uses the full image. Failure to detect a contour is not a scan failure. Four corner coordinates are retained so the review UI can show and edit them. A perspective transform produces a flattened receipt bitmap.

OpenCV documents contours as a basis for shape detection and recommends threshold or edge detection before contour extraction. Its adaptive thresholding calculates thresholds for local regions, making it appropriate for uneven illumination.

### 3. Manual geometry correction

`receipt-image-editor.tsx` displays the original image with an adjustable quadrilateral overlay. Users can:

- accept automatic corners;
- drag each corner;
- select a rectangular crop;
- rotate left or right in 90-degree steps;
- reset to the original image;
- rescan after corrections.

Keyboard-accessible controls accompany pointer gestures. Manual settings exist only in component state until OCR begins.

### 4. Variant generation

`image-variants.ts` creates candidates incrementally rather than materializing every large bitmap at once. Candidate families are:

1. perspective-corrected color or grayscale image;
2. normalized contrast;
3. adaptive threshold for uneven lighting;
4. Otsu threshold for clean thermal paper;
5. lightly sharpened grayscale.

Orientation candidates cover 0, 90, 180, and 270 degrees. Tesseract orientation data can influence ordering, but the pipeline does not trust one orientation result exclusively. Bitmaps and OpenCV matrices are released as soon as their pass completes.

### 5. OCR orchestration

`ocr-orchestrator.ts` owns one reusable Tesseract worker per scan and runs candidate passes in ranked order. OCR stays lazy-loaded. Each pass returns:

- raw text;
- line, word, and bounding-box data when available;
- engine confidence;
- preprocessing and orientation metadata;
- elapsed time.

The orchestrator evaluates every pass through `receipt-candidate-scorer.ts`. Scoring rewards coherent price lines, plausible items, subtotal detection, item-total agreement, useful OCR confidence, and non-duplicated content. It penalizes excessive noise, impossible quantities, unsafe numeric values, and unexplained total differences.

Processing stops early only when a candidate reaches the high-confidence threshold and subtotal reconciliation succeeds. Otherwise it continues until the pass budget is exhausted, the user cancels, or the browser reports memory pressure. Long-running work is isolated from the React render path. Abort terminates the Tesseract worker and releases images and OpenCV matrices.

### 6. Layout-aware receipt interpretation

`receipt-interpreter.ts` consumes OCR lines with geometry when available and plain text as a fallback. It normalizes OCR punctuation, currency markers, thousands separators, multiplication symbols, common digit/letter substitutions in numeric contexts, and whitespace.

The interpreter groups words into visual rows and columns before extracting semantic records. It supports:

- `quantity name price`;
- `name quantity price`;
- `name price`;
- `unit price x quantity total`;
- item name and variant followed by a price row;
- tabular item, quantity, unit-price, and total columns;
- wrapped item names;
- discount, tax, service, tip, subtotal, grand total, and payment rows.

The parser assigns provenance and confidence to every item field. Merchant metadata and payment totals are excluded from item candidates. Existing conservative text parser behavior remains as a fallback for OCR engines or browsers that provide no layout data.

### 7. Reconciliation and review

`receipt-reconciler.ts` compares the sum of parsed item totals with the detected subtotal. It can infer a missing price only when exactly one unresolved item exists and the positive difference is a safe integer. Inferred fields are marked `estimated`; they are never treated as high confidence.

When several items, discounts, or price interpretations could explain a difference, the reconciler returns an ambiguity issue instead of guessing. The review screen shows:

- detected subtotal;
- parsed item total;
- difference;
- item count;
- overall confidence: high, review required, or low;
- per-item estimated or low-confidence indicators;
- alternatives from other OCR passes when materially different.

Only selected, named items with positive prices are handed to the Split Bill draft. Estimated metadata is review-only and does not alter the existing transaction schema.

## Core data contracts

The implementation will introduce contracts equivalent to:

```ts
interface ReceiptPolygon {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
  confidence: number;
  source: "automatic" | "manual" | "full-image";
}

interface OcrCandidate {
  id: string;
  rawText: string;
  lines: OcrLine[];
  engineConfidence: number;
  orientation: 0 | 90 | 180 | 270;
  preprocessing: PreprocessingMode;
  durationMs: number;
}

interface InterpretedReceipt {
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

Exact internal field names may vary, but stage boundaries and uncertainty metadata must remain explicit.

## User interface states

The Scan Struk workspace will use these states:

1. `idle`: file and camera controls.
2. `editing`: preview with automatic or manual geometry controls.
3. `processing`: stage label, pass count, elapsed time, progress, and cancel action.
4. `review`: editable items, totals, confidence, issues, alternatives, and rescan action.
5. `failed`: preserved image, specific failure reason, correction action, and manual editor.

Progress labels describe actual work: loading image, detecting receipt, correcting perspective, preparing variant, recognizing text, interpreting layout, and reconciling totals. A failure never discards the selected image or removes manual editing.

## Performance and resource limits

- OpenCV.js and Tesseract remain dynamically loaded only on the scan page.
- Initial OCR uses the most likely geometry and preprocessing candidate.
- Additional passes are conditional on score and total mismatch.
- Resolution is capped while preserving enough text height for OCR.
- Candidate bitmaps are processed sequentially and released promptly.
- Device capability controls maximum resolution and pass count.
- A hard upper pass limit prevents infinite work even though users tolerate up to five minutes.
- The user can cancel at every processing stage.

The interface favors accuracy over speed but shows continuous progress so a multi-minute scan does not appear frozen.

## Error handling and fallback

- OpenCV load failure: continue with Canvas-based rotation, resizing, grayscale, and Tesseract.
- No receipt contour: process the full image and suggest manual crop.
- Orientation uncertainty: run additional rotation candidates.
- Missing subtotal: show parsed items without claiming reconciliation.
- Ambiguous total mismatch: show the difference and require review.
- Low OCR confidence: retain best candidate, expose alternatives, and recommend image correction or retake.
- Browser memory pressure: reduce resolution and candidate count.
- Abort: terminate active workers and release all native/WASM resources.
- Unsupported browser capability: use the current single-pass OCR and manual editor.

## Privacy and security

- Image pixels and OCR results remain in the browser.
- No analytics event may contain receipt text, item names, prices, or image data.
- OpenCV, Tesseract worker scripts, WASM, and language data are served from application-controlled static assets so scanning does not require sending the receipt to third-party OCR endpoints.
- Object URLs, canvases, workers, and matrices are disposed after cancellation, replacement, or unmount.
- Numeric parsing retains safe-integer checks before data can enter Split Bill.

## Testing strategy

### Unit tests

- orientation and polygon ordering helpers;
- preprocessing selection and pass budgeting;
- candidate scoring and early-stop rules;
- money normalization and common OCR substitutions;
- layout grouping and supported row patterns;
- subtotal reconciliation, including ambiguous cases;
- resource cleanup and abort propagation.

### Image fixtures

Local, non-sensitive fixtures will cover portrait, landscape, upside-down, skewed, perspective-distorted, low-light, uneven-light, faded thermal print, long receipts, and cluttered backgrounds. Fixtures must include multiple receipt layouts and price conventions. `kerja nyata.jpeg` remains a regression fixture, not the sole benchmark.

### Component tests

- file selection enters image editing;
- rotation, crop reset, and corner correction update the scan input;
- processing shows real stages and can be cancelled;
- low-confidence and estimated rows are visible;
- alternatives can replace the selected OCR result;
- rescan retains corrections;
- valid reviewed items still create an item-mode Split Bill draft.

### Release verification

- formatting and lint;
- complete unit/component suite;
- production build;
- smoke tests for Scan Struk and Split Bill handoff;
- manual browser verification on desktop and a mobile viewport;
- confirmation that no network request transmits receipt content.

## Acceptance criteria

- The system is not tied to one sample or merchant layout.
- Automatic orientation considers all four right-angle rotations when needed.
- Perspective correction is automatic when a confident receipt contour exists and manually adjustable otherwise.
- Multiple preprocessing variants are attempted adaptively rather than unconditionally.
- Candidate selection accounts for OCR confidence and receipt arithmetic.
- Parser output retains uncertainty and provenance.
- Missing values are inferred only under a single unambiguous subtotal explanation.
- Users can correct geometry, retry OCR, edit every item, and cancel long work.
- Existing Scan Struk to Split Bill integration remains functional.
- All processing is local and free to the user.

## References

- Tesseract.js browser OCR, orientation detection, and bounding-box support: https://tesseract.projectnaptha.com/
- OpenCV.js contour processing: https://docs.opencv.org/5.0/js_tutorials/js_imgproc/js_contours/js_table_of_contents_contours.html
- OpenCV.js thresholding, including adaptive and Otsu thresholding: https://docs.opencv.org/4.12.0/d7/dd0/tutorial_js_thresholding.html

