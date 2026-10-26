/**
 * Unit tests for the OCR-vs-PdfStructured layout shape classification used
 * by the deliver route to choose between `applyOcrTranslationsToPdf`
 * (OCR overlay) and `generateLayoutPdf` (PDF block re-render).
 *
 * Run with:  npx tsx --test __tests__/ocr-deliver-routing.test.ts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isOcrLayoutShape } from "../lib/pdf-pipeline.js";

// Inlined here so we don't have to import from the route module (which
// pulls in Next.js server runtime). Keep this in sync with the
// `isPdfStructuredShape` helper inside `app/api/jobs/[id]/deliver/route.ts`.
function isPdfStructuredShape(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const obj = x as {
    pages?: unknown;
    body_size?: unknown;
    is_scanned?: unknown;
    source_path?: unknown;
  };
  if (!Array.isArray(obj.pages) || obj.pages.length === 0) return false;
  if (typeof obj.body_size !== "number") return false;
  if (typeof obj.is_scanned !== "boolean") return false;
  if (typeof obj.source_path !== "string") return false;
  const p0 = obj.pages[0] as { width?: unknown; blocks?: unknown };
  if (typeof p0.width !== "number") return false;
  if (!Array.isArray(p0.blocks)) return false;
  if (p0.blocks.length > 0) {
    const b0 = p0.blocks[0] as { format_hint?: unknown; font_size?: unknown };
    if (typeof b0.font_size !== "number") return false;
    if (typeof b0.format_hint !== "string") return false;
  }
  return true;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ocrOverlayLayout = {
  pages: [
    {
      pageNum: 1,
      width: 800,
      height: 1200,
      blocks: [
        { text: "Hello world", bbox: [10, 20, 200, 60] as [number, number, number, number], confidence: 0.95 },
        { text: "Second line", bbox: [10, 80, 220, 120] as [number, number, number, number] },
      ],
    },
    {
      pageNum: 2,
      blocks: [
        { text: "Page two", bbox: [5, 5, 100, 50] as [number, number, number, number] },
      ],
    },
  ],
};

// Mistral-style: no width/height, just blocks with bbox.
const ocrOverlayLayoutNoDims = {
  pages: [
    {
      blocks: [
        { text: "Scanned text", bbox: [0, 0, 500, 80] as [number, number, number, number] },
      ],
    },
  ],
};

// Pure-text OCR with no bboxes: cannot drive overlay renderer.
const ocrTextOnlyLayout = {
  pages: [
    {
      blocks: [
        { text: "No coordinates here" },
        { text: "Still nothing" },
      ],
    },
  ],
};

// Full PdfStructured: top-level body_size/is_scanned/source_path metadata,
// and pages with blocks that carry format_hint + font_size.
const pdfStructuredLayout = {
  body_size: 11,
  is_scanned: false,
  source_path: "/storage/uploads/abc.pdf",
  pages: [
    {
      page_num: 1,
      width: 612,
      height: 792,
      blocks: [
        {
          type: "text",
          text: "Hello",
          bbox: [10, 20, 100, 40],
          font_size: 12,
          format_hint: "p",
          lines: [{ text: "Hello", bbox: [10, 20, 100, 40], font_size: 12 }],
        },
      ],
      tables: [],
    },
  ],
};

// PdfStructured for a scanned source (still has the typography metadata)
const pdfStructuredScannedLayout = {
  body_size: 12,
  is_scanned: true,
  source_path: "/storage/uploads/scan.pdf",
  pages: [
    {
      page_num: 1,
      width: 612,
      height: 792,
      blocks: [
        {
          type: "text",
          text: "block",
          bbox: [0, 0, 50, 20],
          font_size: 11,
          format_hint: "p",
          lines: [],
        },
      ],
      tables: [],
      ocr_confidence: 0.92,
    },
  ],
  ocr_confidence: 0.92,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("isOcrLayoutShape", () => {
  test("accepts OCR overlay layout with bboxes", () => {
    assert.equal(isOcrLayoutShape(ocrOverlayLayout), true);
  });

  test("accepts OCR overlay layout without page dimensions", () => {
    assert.equal(isOcrLayoutShape(ocrOverlayLayoutNoDims), true);
  });

  test("rejects OCR layout with no bboxes (text-only)", () => {
    // Without any positional data we cannot drive the overlay renderer,
    // so isOcrLayoutShape must reject this and let delivery fall back.
    assert.equal(isOcrLayoutShape(ocrTextOnlyLayout), false);
  });

  test("rejects empty / missing payloads", () => {
    assert.equal(isOcrLayoutShape(null), false);
    assert.equal(isOcrLayoutShape(undefined), false);
    assert.equal(isOcrLayoutShape({}), false);
    assert.equal(isOcrLayoutShape({ pages: [] }), false);
    assert.equal(isOcrLayoutShape({ pages: [{ blocks: [] }] }), false);
  });

  test("rejects malformed pages (blocks not an array)", () => {
    assert.equal(isOcrLayoutShape({ pages: [{ blocks: "nope" }] }), false);
  });

  test("also accepts PdfStructured-shaped payloads (blocks have bbox)", () => {
    // PdfStructured pages carry blocks with bbox too — the OCR shape
    // check is intentionally permissive about the EXISTENCE of bboxes
    // (it only checks for the OCR-block surface). The deliver route
    // classifies PdfStructured FIRST and only falls through to the OCR
    // shape when it is not also PdfStructured.
    assert.equal(isOcrLayoutShape(pdfStructuredLayout), true);
    assert.equal(isOcrLayoutShape(pdfStructuredScannedLayout), true);
  });
});

describe("isPdfStructuredShape", () => {
  test("accepts full PdfStructured (digital PDF)", () => {
    assert.equal(isPdfStructuredShape(pdfStructuredLayout), true);
  });

  test("accepts full PdfStructured (scanned PDF with OCR confidence)", () => {
    assert.equal(isPdfStructuredShape(pdfStructuredScannedLayout), true);
  });

  test("rejects OCR overlay payloads (no body_size / format_hint)", () => {
    // OCR-overlay payloads from the OCR pipeline never carry the top-level
    // body_size/is_scanned/source_path metadata, nor per-block format_hint
    // and font_size — so they must NOT be misclassified as PdfStructured.
    assert.equal(isPdfStructuredShape(ocrOverlayLayout), false);
    assert.equal(isPdfStructuredShape(ocrOverlayLayoutNoDims), false);
  });

  test("rejects empty / missing payloads", () => {
    assert.equal(isPdfStructuredShape(null), false);
    assert.equal(isPdfStructuredShape(undefined), false);
    assert.equal(isPdfStructuredShape({}), false);
    assert.equal(isPdfStructuredShape({ pages: [] }), false);
  });

  test("rejects payloads missing top-level metadata", () => {
    // Same as pdfStructuredLayout but without body_size — must be rejected.
    const missingBodySize = {
      ...pdfStructuredLayout,
      body_size: undefined,
    };
    assert.equal(isPdfStructuredShape(missingBodySize), false);
  });

  test("rejects payloads where blocks lack format_hint/font_size", () => {
    const noTypographyMeta = {
      body_size: 11,
      is_scanned: false,
      source_path: "/tmp/x.pdf",
      pages: [
        {
          width: 612,
          height: 792,
          blocks: [{ text: "x", bbox: [0, 0, 10, 10] }],
        },
      ],
    };
    assert.equal(isPdfStructuredShape(noTypographyMeta), false);
  });
});

describe("deliver-route classification (combined)", () => {
  // Mirrors the exact logic in app/api/jobs/[id]/deliver/route.ts:
  //   const pdfShapedOcrLayout = isPdfStructuredShape(raw) ? raw : null;
  //   const ocrOverlayLayout =
  //     isOcrLayoutShape(raw) && !pdfShapedOcrLayout ? raw : null;
  function classify(raw: unknown): "pdf-structured" | "ocr-overlay" | "none" {
    const isPdf = isPdfStructuredShape(raw);
    if (isPdf) return "pdf-structured";
    if (isOcrLayoutShape(raw)) return "ocr-overlay";
    return "none";
  }

  test("Full PdfStructured payload routes to pdf-structured (generateLayoutPdf)", () => {
    assert.equal(classify(pdfStructuredLayout), "pdf-structured");
    assert.equal(classify(pdfStructuredScannedLayout), "pdf-structured");
  });

  test("OCR overlay payload routes to ocr-overlay (applyOcrTranslationsToPdf)", () => {
    assert.equal(classify(ocrOverlayLayout), "ocr-overlay");
    assert.equal(classify(ocrOverlayLayoutNoDims), "ocr-overlay");
  });

  test("OCR text-only (no bboxes) routes to none (falls back to DOCX/HTML)", () => {
    assert.equal(classify(ocrTextOnlyLayout), "none");
  });

  test("null / missing structuredLayout routes to none", () => {
    assert.equal(classify(null), "none");
    assert.equal(classify(undefined), "none");
  });
});
