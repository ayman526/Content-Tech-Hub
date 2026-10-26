import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateTranslatedPdf,
  generateLayoutPdf,
  applyTranslationsToPdf,
  applyOcrTranslationsToPdf,
  applyTranslationsToPptx,
  generateDocx,
  generateDocxTable,
  translateDocxInPlace,
  getPdfMetadata,
  isOcrLayoutShape,
  isRtlLanguage,
  type PdfStructured,
  type OcrStructuredLayout,
} from "@/lib/pdf-pipeline";
import { existsSync } from "fs";
import { readFile as fsReadFile } from "fs/promises";
import path from "path";
import { toAbsoluteStoragePath } from "@/lib/storage-path";
import {
  expandMarkdownSegments,
  parseCellHint,
  looksLikeMarkdownTable,
  parseMarkdownTable,
} from "@/lib/markdown-segments";
import {
  applyOverlay,
  renderHtmlToPdf,
  PdfServiceError,
  type OverlayBlock,
} from "@/lib/pdf-processor-client";

/** Map common language display names to their ISO 639-1 code (upper-case). */
const LANG_NAME_TO_CODE: Record<string, string> = {
  arabic: "AR", french: "FR", german: "DE", spanish: "ES",
  japanese: "JA", chinese: "ZH", mandarin: "ZH", portuguese: "PT",
  italian: "IT", russian: "RU", korean: "KO", dutch: "NL",
  turkish: "TR", polish: "PL", swedish: "SV", danish: "DA",
  norwegian: "NO", hebrew: "HE", persian: "FA", farsi: "FA",
  urdu: "UR", hindi: "HI", bengali: "BN", thai: "TH",
  vietnamese: "VI", indonesian: "ID", malay: "MS", greek: "EL",
  czech: "CS", romanian: "RO", hungarian: "HU", finnish: "FI",
  ukrainian: "UK", bulgarian: "BG", croatian: "HR", slovak: "SK",
  slovenian: "SL", serbian: "SR", catalan: "CA", basque: "EU",
  galician: "GL", latvian: "LV", lithuanian: "LT", estonian: "ET",
  maltese: "MT", icelandic: "IS", albanian: "SQ", macedonian: "MK",
  bosnian: "BS", swahili: "SW", zulu: "ZU", afrikaans: "AF",
  tagalog: "TL", filipino: "TL", nepali: "NE", sinhala: "SI",
  myanmar: "MY", burmese: "MY", khmer: "KM", lao: "LO",
  georgian: "KA", armenian: "HY", azerbaijani: "AZ", kazakh: "KK",
  uzbek: "UZ", mongolian: "MN", tibetan: "BO", amharic: "AM",
};

function getLangCode(lang: string): string {
  const lower = lang.toLowerCase().trim();
  if (LANG_NAME_TO_CODE[lower]) return LANG_NAME_TO_CODE[lower];
  for (const [name, code] of Object.entries(LANG_NAME_TO_CODE)) {
    if (lower.includes(name)) return code;
  }
  // Locale codes like "ar-EG", "fr-FR", "zh-CN"
  const parts = lang.split(/[-_]/);
  return (parts[0] || lang).toUpperCase().slice(0, 2);
}

/**
 * Derive a clean stem from the original filename:
 * "Q4 Legal Contract.pdf"  → "Q4_Legal_Contract"
 * "report (final).docx"   → "report_final"
 */
function buildStem(originalFilename: string | null | undefined, fallback: string): string {
  if (!originalFilename) {
    return fallback.replace(/[^a-z0-9_\-\s]/gi, "").replace(/\s+/g, "_").slice(0, 50);
  }
  const base = path.basename(originalFilename, path.extname(originalFilename));
  return base
    .replace(/[^a-z0-9_\-\s]/gi, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

/** Build a printable HTML document from translated segments for renderHtmlToPdf. */
function buildDeliveryHtml(
  segments: { sourceText: string; translatedText: string | null; formatHint: string; direction?: string | null }[],
  targetLanguage: string,
  documentTitle: string,
  rtl: boolean,
): string {
  const dir = rtl ? "rtl" : "ltr";
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const cellText = (s: { sourceText: string; translatedText: string | null }) =>
    esc((s.translatedText ?? s.sourceText).trim());

  // Expand markdown tables/headings and strip image-only segments
  const expanded = expandMarkdownSegments(
    segments.map(s => ({
      sourceText: s.sourceText,
      translatedText: s.translatedText,
      formatHint: s.formatHint,
    }))
  );

  const parts: string[] = [];
  let i = 0;
  while (i < expanded.length) {
    const seg = expanded[i];
    const cell = parseCellHint(seg.formatHint);

    // ── Table: collect all consecutive cells sharing the same tableId ──────
    if (cell) {
      const tId = cell.tableId;
      const headerCells: string[] = [];
      const bodyRows: Map<number, string[]> = new Map();
      while (i < expanded.length) {
        const c = parseCellHint(expanded[i].formatHint);
        if (!c || c.tableId !== tId) break;
        if (c.kind === "th") {
          headerCells[c.col] = cellText(expanded[i]);
        } else {
          const row = bodyRows.get(c.row) ?? [];
          row[c.col] = cellText(expanded[i]);
          bodyRows.set(c.row, row);
        }
        i++;
      }
      const colCount = Math.max(
        headerCells.length,
        ...Array.from(bodyRows.values()).map(r => r.length),
        1,
      );
      const thead = headerCells.length
        ? `<thead><tr>${Array.from({ length: colCount }, (_, c) => `<th>${headerCells[c] ?? ""}</th>`).join("")}</tr></thead>`
        : "";
      const tbody = bodyRows.size
        ? `<tbody>${Array.from(bodyRows.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([, r]) => `<tr>${Array.from({ length: colCount }, (_, c) => `<td>${r[c] ?? ""}</td>`).join("")}</tr>`)
            .join("")}</tbody>`
        : "";
      parts.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    // ── List items: wrap consecutive li's in a <ul> ───────────────────────
    if (seg.formatHint === "li") {
      const items: string[] = [];
      while (i < expanded.length && expanded[i].formatHint === "li") {
        items.push(`<li>${cellText(expanded[i])}</li>`);
        i++;
      }
      parts.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // ── Single block ──────────────────────────────────────────────────────
    const safe = cellText(seg);
    const segDir = seg.formatHint === "rtl" ? "rtl" : dir;
    switch (seg.formatHint) {
      case "h1": parts.push(`<h1 dir="${segDir}">${safe}</h1>`); break;
      case "h2": parts.push(`<h2 dir="${segDir}">${safe}</h2>`); break;
      case "h3": parts.push(`<h3 dir="${segDir}">${safe}</h3>`); break;
      default:   parts.push(`<p dir="${segDir}">${safe}</p>`);
    }
    i++;
  }

  return `<!DOCTYPE html>
<html lang="${esc(targetLanguage)}" dir="${dir}">
<head>
<meta charset="UTF-8">
<title>${esc(documentTitle)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.6; margin: 2cm; color: #111; direction: ${dir}; }
  h1 { font-size: 18pt; font-weight: bold; margin: 16px 0 8px; }
  h2 { font-size: 14pt; font-weight: bold; margin: 14px 0 6px; }
  h3 { font-size: 12pt; font-weight: bold; margin: 12px 0 4px; }
  p  { margin: 6px 0; }
  li { margin: 3px 0; }
  ul { padding-${rtl ? "right" : "left"}: 1.5em; margin: 4px 0; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; }
  th { background: #f0f0f0; font-weight: bold; }
  @page { margin: 2cm; }
</style>
</head>
<body>
${parts.join("\n")}
</body>
</html>`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;

  const url = new URL(req.url);
  const formatParam = (url.searchParams.get("format") ?? "auto") as
    | "auto" | "pdf" | "docx" | "layout" | "pptx";

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      jobTranslations: true,
      project: {
        include: {
          documents: {
            include: {
              segments: { orderBy: { segmentIndex: "asc" } },
            },
          },
          attachedOcrRequest: true,
        },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const translationMap = new Map<string, string>(
    (job as any).jobTranslations.map((jt: any) => [jt.segmentId, jt.translatedText])
  );

  const allSegments = job.project.documents.flatMap((doc: any) =>
    doc.segments.map((s: any) => ({
      sourceText: s.sourceText as string,
      translatedText: (translationMap.get(s.id) ?? s.translatedText ?? null) as string | null,
      formatHint: (s.formatHint ?? "p") as string,
      // Typography / geometry metadata (populated by pdf-processor microservice)
      blockId:      (s.blockId      as string | null)                                             ?? null,
      blockPage:    (s.blockPage    as number | null)                                             ?? null,
      bboxJson:     (s.bboxJson     as { x: number; y: number; width: number; height: number } | null) ?? null,
      fontFamily:   (s.fontFamily   as string | null)                                             ?? null,
      fontSize:     (s.fontSize     as number | null)                                             ?? null,
      fontColor:    (s.fontColor    as string | null)                                             ?? null,
      fontWeight:   (s.fontWeight   as string | null)                                             ?? null,
      textAlignment:(s.textAlignment as string | null)                                            ?? null,
      direction:    (s.direction    as string | null)                                             ?? null,
    }))
  );

  if (allSegments.length === 0) {
    return NextResponse.json({ error: "No segments found for this job" }, { status: 404 });
  }

  const firstDoc = job.project.documents[0];
  // If the project was created from an OCR request and the document itself
  // has no structured layout, fall back to the layout captured during OCR
  // so layout-preserving delivery still works for scanned originals. We
  // ONLY use the OCR fallback when its shape matches PdfStructured (i.e.
  // pages have `lines`/`blocks` with bbox + font_size). The lighter
  // OcrExtractResult.structuredLayout shape (blocks-only, no font/line
  // metadata) is incompatible with `generateLayoutPdf` and would produce
  // poor fidelity output, so we leave structuredData null in that case
  // and fall back to the block-based HTML renderer.
  function isPdfStructuredShape(x: unknown): x is PdfStructured {
    if (!x || typeof x !== "object") return false;
    const obj = x as {
      pages?: unknown;
      body_size?: unknown;
      is_scanned?: unknown;
      source_path?: unknown;
    };
    if (!Array.isArray(obj.pages) || obj.pages.length === 0) return false;
    // PdfStructured carries top-level extraction metadata that the lighter
    // OcrStructuredLayout never includes. Require these as strong markers
    // so an OCR-overlay payload that happens to have width+blocks is not
    // misclassified as PdfStructured (which would bypass the OCR overlay
    // path and fall through to PyMuPDF text extraction on a scanned doc).
    if (typeof obj.body_size !== "number") return false;
    if (typeof obj.is_scanned !== "boolean") return false;
    if (typeof obj.source_path !== "string") return false;
    const p0 = obj.pages[0] as {
      width?: unknown;
      blocks?: unknown;
    };
    if (typeof p0.width !== "number") return false;
    // PdfStructured pages always carry blocks (each with format_hint +
    // font_size); OCR overlay pages carry blocks too but without those
    // typography fields.
    if (!Array.isArray(p0.blocks)) return false;
    if (p0.blocks.length > 0) {
      const b0 = p0.blocks[0] as {
        format_hint?: unknown;
        font_size?: unknown;
      };
      if (typeof b0.font_size !== "number") return false;
      if (typeof b0.format_hint !== "string") return false;
    }
    return true;
  }
  const ocrLayoutRaw = job.project.attachedOcrRequest?.structuredLayout ?? null;
  // Two distinct shapes can live in `attachedOcrRequest.structuredLayout`:
  //   * Full PdfStructured (PyMuPDF blocks w/ width/height/lines/font_size)
  //   * Lightweight OcrStructuredLayout (just pages[].blocks[].bbox/text)
  // The first is suitable for `generateLayoutPdf`; the second drives the
  // `applyOcrTranslationsToPdf` overlay path. We classify here so the
  // layout branch downstream can route correctly.
  const pdfShapedOcrLayout = isPdfStructuredShape(ocrLayoutRaw) ? ocrLayoutRaw : null;
  const ocrOverlayLayout: OcrStructuredLayout | null =
    isOcrLayoutShape(ocrLayoutRaw) && !pdfShapedOcrLayout
      ? (ocrLayoutRaw as OcrStructuredLayout)
      : null;
  const structuredData: PdfStructured | null =
    (firstDoc?.structuredData && isPdfStructuredShape(firstDoc.structuredData)
      ? (firstDoc.structuredData as PdfStructured)
      : null) ?? pdfShapedOcrLayout ?? null;
  const documentTitle = job.project.name;
  const targetLanguage = job.targetLanguage;
  const rtl = isRtlLanguage(targetLanguage);
  const fileType = firstDoc?.fileType ?? "pdf";

  // ── Derived filename ───────────────────────────────────────────────────────
  const langCode = getLangCode(targetLanguage);
  const stem = buildStem(firstDoc?.originalFilename, documentTitle);
  // e.g. "Q4_Legal_Contract_AR"
  const baseName = `${stem}_${langCode}`;

  // ── OCR source path (hoisted so auto-format detection can use it) ─────────
  const ocrSourcePath = toAbsoluteStoragePath(
    job.project.attachedOcrRequest?.sourceFileUrl ?? firstDoc?.originalFileUrl ?? null,
  );
  const ocrSourceExists =
    typeof ocrSourcePath === "string" &&
    ocrSourcePath !== "#" &&
    existsSync(ocrSourcePath);

  // ── Effective format (auto-detect from source when not explicitly given) ──
  let effectiveFormat = formatParam;
  if (effectiveFormat === "auto") {
    if (fileType === "pptx") {
      effectiveFormat = "pptx";
    } else if (ocrOverlayLayout && ocrSourceExists) {
      effectiveFormat = "layout";
    } else if (allSegments.some(s => s.bboxJson)) {
      // Segments carry pdfminer.six bbox metadata → prefer layout-preserving overlay
      effectiveFormat = "layout";
    } else {
      effectiveFormat = "pdf";
    }
  }

  // ── Build srcToTranslation map ──────────────────────────────────────────
  const srcToTranslation = new Map<string, string>();
  for (const seg of allSegments) {
    if (!seg.translatedText) continue;
    const src = seg.sourceText.trim();
    const trg = seg.translatedText.trim();
    // Whole-segment entry (used by structuredData block layout path)
    srcToTranslation.set(src, trg);
    // When a segment is a markdown table, also add individual cell-level
    // entries so the OCR overlay script can match bbox blocks by their
    // short cell texts (e.g. "Matières" → "Subjects", "14,3" → "14.3").
    if (looksLikeMarkdownTable(src) && looksLikeMarkdownTable(trg)) {
      const srcRows = parseMarkdownTable(src);
      const trgRows = parseMarkdownTable(trg);
      for (let r = 0; r < srcRows.length; r++) {
        const srcRow = srcRows[r];
        const trgRow = trgRows[r] ?? [];
        for (let c = 0; c < srcRow.length; c++) {
          const cellSrc = srcRow[c].trim();
          const cellTrg = (trgRow[c] ?? "").trim();
          if (cellSrc && cellTrg) srcToTranslation.set(cellSrc, cellTrg);
        }
      }
    }
  }

  console.log(
    "[deliver] format:", effectiveFormat,
    "| fileType:", fileType,
    "| langCode:", langCode,
    "| rtl:", rtl,
    "| hasStructured:", !!structuredData,
    "| hasLayoutHtml:", !!((firstDoc as any)?.layoutHtml),
    "| segments:", allSegments.length,
    "| baseName:", baseName,
  );

  // ── PPTX (layout-preserving presentation) ─────────────────────────────────
  if (effectiveFormat === "pptx" || (fileType === "pptx" && effectiveFormat !== "pdf" && effectiveFormat !== "docx")) {
    const originalPptxPath = toAbsoluteStoragePath(firstDoc?.originalFileUrl ?? null);
    const hasPptx =
      typeof originalPptxPath === "string" &&
      originalPptxPath !== "#" &&
      existsSync(originalPptxPath);

    if (hasPptx) {
      console.log("[deliver] Generating translated PPTX:", originalPptxPath);
      const pptxBuffer = await applyTranslationsToPptx(originalPptxPath!, srcToTranslation, targetLanguage);
      return new NextResponse(pptxBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${baseName}.pptx"`,
          "Content-Length": pptxBuffer.length.toString(),
        },
      });
    }
    console.log("[deliver] Original PPTX not available — falling back to PDF");
  }

  // ── Explicit DOCX ──────────────────────────────────────────────────────────
  if (effectiveFormat === "docx") {
    // Prefer in-place translation: unzip the original DOCX, swap text runs in
    // the XML, rezip — this preserves ALL source formatting (fonts, sizes,
    // bullets, tables, borders, shading) without any rebuilding.
    const originalDocxPath = toAbsoluteStoragePath(firstDoc?.originalFileUrl ?? null);
    const hasOriginalDocx =
      fileType === "docx" &&
      typeof originalDocxPath === "string" &&
      originalDocxPath !== "#" &&
      existsSync(originalDocxPath);

    let docxBuffer: Buffer;
    if (hasOriginalDocx) {
      console.log("[deliver] DOCX in-place translation:", originalDocxPath);
      docxBuffer = await translateDocxInPlace(originalDocxPath!, srcToTranslation, targetLanguage);
    } else {
      console.log("[deliver] DOCX rebuild (no original on disk)");
      docxBuffer = await generateDocx({ segments: allSegments, targetLanguage, documentTitle });
    }

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${baseName}.docx"`,
        "Content-Length": docxBuffer.length.toString(),
      },
    });
  }

  let pdfBuffer: Buffer;

  // ── Layout-preserving PDF ──────────────────────────────────────────────────
  if (effectiveFormat === "layout") {
    const originalPdfPath = toAbsoluteStoragePath(firstDoc?.originalFileUrl ?? null);
    const hasOriginalFile =
      typeof originalPdfPath === "string" &&
      originalPdfPath !== "#" &&
      existsSync(originalPdfPath);

    // ── Phase 3: microservice overlay path (segment bboxJson metadata) ──────
    const overlayBlocks: OverlayBlock[] = allSegments
      .filter(s => s.bboxJson && s.translatedText)
      .map(s => ({
        blockId:    s.blockId ?? "b_0_0000",
        translatedText: s.translatedText!,
        bbox:       s.bboxJson!,
        page:       s.blockPage ?? 0,
        fontFamily: s.fontFamily ?? "helv",
        fontSize:   s.fontSize ?? 11,
        fontColor:  s.fontColor ?? "#000000",
        alignment:  (s.textAlignment ?? "left") as "left" | "center" | "right" | "justify",
        direction:  (s.direction ?? (rtl ? "rtl" : "ltr")) as "ltr" | "rtl",
      }));

    if (overlayBlocks.length > 0) {
      const srcPath = ocrSourceExists ? ocrSourcePath! : originalPdfPath;
      if (srcPath && srcPath !== "#" && existsSync(srcPath)) {
        console.log("[deliver] Phase3 microservice overlay — blocks:", overlayBlocks.length, "| src:", srcPath);
        const srcBuffer = await fsReadFile(srcPath);
        try {
          pdfBuffer = await applyOverlay(srcBuffer, overlayBlocks);
        } catch (overlayErr) {
          // Any failure (service down or overlay error) → 503. No silent fallback to local rendering.
          console.error("[deliver] applyOverlay failed:", (overlayErr as Error)?.message);
          return NextResponse.json(
            {
              error: "PDF processor service is unavailable. Please try again later.",
              serviceError: true,
              serviceUrl: process.env.PDF_PROCESSOR_SERVICE_URL ?? "http://localhost:8001",
            },
            { status: 503 }
          );
        }
      } else {
        console.warn("[deliver] Overlay blocks present but no source PDF on disk");
        return NextResponse.json(
          { error: "Source PDF not available for layout overlay.", serviceError: false },
          { status: 503 }
        );
      }
    } else {
      // No bbox data — old job without microservice metadata → legacy overlay paths
      pdfBuffer = await legacyLayoutPdf();
    }

    async function legacyLayoutPdf(): Promise<Buffer> {
      if (ocrOverlayLayout && ocrSourceExists) {
        console.log(
          "[deliver] Legacy OCR overlay path:", ocrSourcePath,
          "| pages:", ocrOverlayLayout.pages.length,
          "| srcEntries:", srcToTranslation.size,
        );
        return await applyOcrTranslationsToPdf(
          ocrSourcePath!,
          ocrOverlayLayout,
          srcToTranslation,
          targetLanguage,
          job.project.attachedOcrRequest?.sourceMimeType ?? null,
        );
      } else if (hasOriginalFile) {
        console.log("[deliver] Legacy direct PDF editing via PyMuPDF:", originalPdfPath);
        return await applyTranslationsToPdf(originalPdfPath!, srcToTranslation, targetLanguage);
      } else if (structuredData && (structuredData as any).pages?.length > 0) {
        console.log("[deliver] Legacy structured-data block layout");
        return await generateLayoutPdf(structuredData, srcToTranslation, targetLanguage);
      } else if ((firstDoc as any)?.layoutHtml && !rtl) {
        return await generateTranslatedPdf(
          (firstDoc as any).layoutHtml as string,
          srcToTranslation,
          targetLanguage,
        );
      } else {
        const docxBuffer = await generateDocxTable({ segments: allSegments, targetLanguage, documentTitle });
        return docxBuffer as unknown as Buffer; // DOCX as last resort for legacy jobs
      }
    }

  } else {
    // ── Clean translated PDF — Phase 3: renderHtmlToPdf via microservice ───
    const html = buildDeliveryHtml(allSegments, targetLanguage, documentTitle, rtl);
    console.log("[deliver] Phase3 renderHtmlToPdf via microservice");
    try {
      pdfBuffer = await renderHtmlToPdf(html);
    } catch (renderErr) {
      // Any failure (service down or render error) → 503. No silent fallback to legacy renderers.
      console.error("[deliver] renderHtmlToPdf failed:", (renderErr as Error)?.message);
      return NextResponse.json(
        {
          error: "PDF renderer unavailable",
          serviceUrl: process.env.PDF_PROCESSOR_SERVICE_URL ?? "http://localhost:8001",
        },
        { status: 503 }
      );
    }
  }

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
