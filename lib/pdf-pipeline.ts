import { exec } from "child_process";
import { promisify } from "util";
import { execSync } from "child_process";
import { writeFile, readFile, readdir, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { expandMarkdownSegments, parseCellHint } from "@/lib/markdown-segments";
import type { Table, TableRow, Paragraph } from "docx";

// ─── Font loading ────────────────────────────────────────────────────────────

/** Cache so we only read the font file once per process lifetime. */
const _fontCache: Record<string, string> = {};

/**
 * Load a font file from public/fonts and return it as a base64 string.
 * Returns empty string on failure — Chromium will fall back to system fonts.
 */
async function loadFontB64(filename: string): Promise<string> {
  if (_fontCache[filename] !== undefined) return _fontCache[filename];
  try {
    const fontPath = join(process.cwd(), "public", "fonts", filename);
    const buf = await readFile(fontPath);
    _fontCache[filename] = buf.toString("base64");
  } catch {
    _fontCache[filename] = "";
  }
  return _fontCache[filename];
}

/**
 * Build an embedded @font-face CSS block for RTL (Arabic) or LTR rendering.
 * Uses locally hosted woff2 files to avoid any Google Fonts network dependency.
 */
async function buildFontFaceBlock(rtl: boolean): Promise<{ css: string; fontFamily: string }> {
  if (!rtl) {
    return { css: "", fontFamily: "'Helvetica Neue',Arial,sans-serif" };
  }

  const regularB64 = await loadFontB64("NotoSansArabic-Regular.woff2");
  const boldB64    = await loadFontB64("NotoSansArabic-Bold.woff2");

  const makeUrl = (b64: string) =>
    b64 ? `url("data:font/woff2;base64,${b64}") format("woff2")` : "";

  const regularUrl = makeUrl(regularB64);
  const boldUrl    = makeUrl(boldB64);

  const css = [
    regularUrl && `
@font-face {
  font-family: 'NotoArabic';
  font-style: normal;
  font-weight: 400;
  src: ${regularUrl};
}`,
    boldUrl && `
@font-face {
  font-family: 'NotoArabic';
  font-style: normal;
  font-weight: 700;
  src: ${boldUrl};
}`,
  ]
    .filter(Boolean)
    .join("\n");

  const fontFamily = regularB64
    ? "'NotoArabic','Noto Sans Arabic','Arial Unicode MS',Arial,sans-serif"
    : "'Noto Sans Arabic','Arial Unicode MS',Arial,sans-serif";

  return { css, fontFamily };
}

const execAsync = promisify(exec);

function findBin(name: string): string {
  try {
    return execSync(`which ${name} 2>/dev/null`).toString().trim() || name;
  } catch {
    return name;
  }
}

export const CHROMIUM_BIN = findBin("chromium");
export const TESSERACT_BIN = findBin("tesseract");

/** Save a Next.js File object to a temp path, returns the path */
export async function saveTmpPdf(file: File): Promise<string> {
  const tmpPath = join(tmpdir(), `doc_${randomUUID()}.pdf`);
  await writeFile(tmpPath, Buffer.from(await file.arrayBuffer()));
  return tmpPath;
}

/** Returns true if the PDF has extractable text (not a scanned image PDF) */
export async function isPdfEditable(pdfPath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `pdftotext "${pdfPath}" - 2>/dev/null | tr -d '[:space:]' | wc -c`
    );
    return parseInt(stdout.trim()) > 80;
  } catch {
    return false;
  }
}

/** Extract text from an editable PDF, preserving column/paragraph layout */
export async function extractPdfText(pdfPath: string): Promise<string> {
  const { stdout } = await execAsync(`pdftotext -layout "${pdfPath}" -`);
  return stdout;
}

function ptToMm(pt: number): string {
  return `${(pt * 0.352778).toFixed(1)}mm`;
}

/** Get page count and dimensions (in mm) from a PDF */
export async function getPdfMetadata(
  pdfPath: string
): Promise<{ pages: number; width: string; height: string }> {
  try {
    const { stdout } = await execAsync(`pdfinfo "${pdfPath}"`);
    const pagesMatch = stdout.match(/Pages:\s+(\d+)/);
    const sizeMatch = stdout.match(/Page size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts/);
    return {
      pages: pagesMatch ? parseInt(pagesMatch[1]) : 1,
      width: sizeMatch ? ptToMm(parseFloat(sizeMatch[1])) : "210mm",
      height: sizeMatch ? ptToMm(parseFloat(sizeMatch[2])) : "297mm",
    };
  } catch {
    return { pages: 1, width: "210mm", height: "297mm" };
  }
}

/**
 * OCR a scanned PDF page-by-page using pdftoppm + tesseract.
 * languages: tesseract language codes separated by + e.g. "eng+ara"
 */
export async function ocrPdf(
  pdfPath: string,
  languages = "eng+ara"
): Promise<string> {
  const dir = join(tmpdir(), `ocr_${randomUUID()}`);
  await mkdir(dir, { recursive: true });

  try {
    await execAsync(
      `pdftoppm -r 200 -png "${pdfPath}" "${join(dir, "page")}"`
    );

    const { stdout: listing } = await execAsync(`ls "${dir}"`);
    const images = listing
      .trim()
      .split("\n")
      .filter((f) => f.endsWith(".png"))
      .sort();

    const texts: string[] = [];
    for (const img of images) {
      try {
        const { stdout } = await execAsync(
          `${TESSERACT_BIN} "${join(dir, img)}" stdout -l ${languages} 2>/dev/null`
        );
        const cleaned = stdout.trim();
        if (cleaned) texts.push(cleaned);
      } catch {
        /* skip failed pages */
      }
    }

    return texts.join("\n\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ─── PyMuPDF structured extraction ───────────────────────────────────────────

export type PdfSpan = {
  text: string;
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
  color: string;
};

export type PdfLine = {
  bbox: [number, number, number, number];
  spans: PdfSpan[];
};

export type PdfBlock = {
  type: "text";
  bbox: [number, number, number, number];
  text: string;
  format_hint: "h1" | "h2" | "h3" | "p" | "li";
  font_size: number;
  lines: PdfLine[];
};

export type PdfTable = {
  bbox: [number, number, number, number];
  rows: string[][];
};

export type PdfPage = {
  page_num: number;
  width: number;
  height: number;
  blocks: PdfBlock[];
  tables: PdfTable[];
  ocr_confidence?: number; // present only when is_scanned=true
};

export type PdfStructured = {
  pages: PdfPage[];
  body_size: number;
  is_scanned: boolean;
  source_path: string;
  ocr_confidence?: number; // mean confidence across pages, 0..1
};

const PYTHON_BIN = findBin("python3");

/**
 * Convert PdfStructured blocks into flat segments for the translation pipeline.
 * Each block becomes one segment, preserving the format_hint.
 */
export function structuredToSegments(
  data: PdfStructured
): Array<{ sourceText: string; formatHint: string }> {
  const segs: Array<{ sourceText: string; formatHint: string }> = [];
  for (const page of data.pages) {
    for (const block of page.blocks) {
      const text = block.text.trim();
      if (text.length < 2) continue;
      segs.push({ sourceText: text, formatHint: block.format_hint });
    }
    for (const table of page.tables) {
      for (const row of table.rows) {
        for (const cell of row) {
          const text = cell.trim();
          if (text.length < 2) continue;
          segs.push({ sourceText: text, formatHint: "td" });
        }
      }
    }
  }
  return segs;
}

/**
 * Generate a pixel-perfect layout-preserving HTML using PyMuPDF block positions.
 * Each text block is absolutely positioned on a per-page canvas using the exact
 * bounding box from the extraction, with translations swapped in.
 *
 * This is far more accurate than the pdftohtml approach because:
 * - Block coordinates come directly from PyMuPDF (no lossy HTML round-trip)
 * - Font size/weight are preserved from the original span metadata
 * - Tables are rendered as <table> elements at correct positions
 */
export async function generateLayoutHtmlFromStructured(
  data: PdfStructured,
  translationMap: Map<string, string>,
  targetLanguage: string
): Promise<string> {
  const rtl = isRtlLanguage(targetLanguage);
  const { css: fontFaceCss, fontFamily } = await buildFontFaceBlock(rtl);

  const PT_SCALE = 1; // 1pt = 1px in the generated layout

  function lookupTranslation(srcText: string): string {
    const key = srcText.replace(/\s+/g, " ").trim();
    return translationMap.get(key) ?? translationMap.get(key.toLowerCase()) ?? srcText;
  }

  const pagesHtml = data.pages.map((page) => {
    const W = page.width * PT_SCALE;
    const H = page.height * PT_SCALE;

    const blockDivs = page.blocks.map((block) => {
      const [x0, y0, x1, y1] = block.bbox.map((v) => v * PT_SCALE);
      const w = x1 - x0;
      const h = y1 - y0;
      const translated = lookupTranslation(block.text);
      const tag = block.format_hint === "h1" ? "h1"
        : block.format_hint === "h2" ? "h2"
        : block.format_hint === "h3" ? "h3"
        : "p";
      const dominantSize = block.font_size;
      const bold = block.lines[0]?.spans[0]?.bold ? "font-weight:700;" : "";
      const color = block.lines[0]?.spans[0]?.color ?? "#000";
      const dir = rtl ? "rtl" : "ltr";
      return `<div style="position:absolute;left:${x0.toFixed(1)}px;top:${y0.toFixed(1)}px;width:${w.toFixed(1)}px;min-height:${h.toFixed(1)}px;overflow:visible;direction:${dir};">
  <${tag} style="margin:0;padding:0;font-size:${dominantSize.toFixed(1)}pt;${bold}color:${color};line-height:1.3;white-space:pre-wrap;">${escapeHtml(translated)}</${tag}>
</div>`;
    });

    const tableDivs = page.tables.map((tbl) => {
      const [tx0, ty0] = tbl.bbox.map((v: number) => v * PT_SCALE);
      const tw = (tbl.bbox[2] - tbl.bbox[0]) * PT_SCALE;
      const rows = tbl.rows.map((row) => {
        const cells = row.map((cell) => {
          const translated = lookupTranslation(cell);
          return `<td style="border:1px solid #ccc;padding:3px 6px;font-size:9pt;direction:${rtl ? "rtl" : "ltr"}">${escapeHtml(translated)}</td>`;
        }).join("");
        return `<tr>${cells}</tr>`;
      }).join("\n");
      return `<div style="position:absolute;left:${tx0.toFixed(1)}px;top:${ty0.toFixed(1)}px;width:${tw.toFixed(1)}px;">
  <table style="border-collapse:collapse;width:100%">${rows}</table>
</div>`;
    });

    return `<div class="pdf-page" style="position:relative;width:${W.toFixed(1)}px;height:${H.toFixed(1)}px;background:white;margin:0 auto 24px;box-shadow:0 2px 8px rgba(0,0,0,.18);">
${blockDivs.join("\n")}
${tableDivs.join("\n")}
</div>`;
  });

  return `<!DOCTYPE html>
<html dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8">
<style>
${fontFaceCss}
body { margin:0; padding:24px 0; background:#e8eaed; font-family:${fontFamily}; }
h1,h2,h3,p { margin:0; padding:0; }
</style>
</head>
<body>
${pagesHtml.join("\n")}
</body>
</html>`;
}

/**
 * Generate a layout-preserving PDF from PyMuPDF structured data.
 * Creates an absolutely-positioned HTML page per the block positions, then
 * renders it with Puppeteer at the exact dimensions of the source document.
 */
export async function generateLayoutPdf(
  structuredData: PdfStructured,
  translationMap: Map<string, string>,
  targetLanguage: string
): Promise<Buffer> {
  const html = await generateLayoutHtmlFromStructured(structuredData, translationMap, targetLanguage);
  const firstPage = structuredData.pages[0];
  const pageW = firstPage ? `${firstPage.width.toFixed(1)}px` : "595px";
  const pageH = firstPage ? `${firstPage.height.toFixed(1)}px` : "842px";

  const puppeteer = (await import("puppeteer-core")).default;
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_BIN,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 300));

    const pdfBytes = await page.pdf({
      width: pageW,
      height: pageH,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}

const APPLY_SCRIPT = join(process.cwd(), "scripts", "apply_translations.py");
const APPLY_OCR_SCRIPT = join(
  process.cwd(),
  "scripts",
  "apply_ocr_translations.py",
);

// ─── OCR-derived layout overlay ───────────────────────────────────────────────

/** Loose shape of `OcrRequest.structuredLayout`. Pages always carry a
 *  `blocks` array, but width/height are optional (Mistral path doesn't
 *  populate them). Each block's `bbox` is `[x0, y0, x1, y1]` in either
 *  PDF point coords (PyMuPDF blocks) or image pixel coords (tesseract on
 *  a raster). The python overlay script handles both. */
export type OcrStructuredLayout = {
  pages: Array<{
    pageNum?: number;
    width?: number;
    height?: number;
    blocks: Array<{
      text: string;
      bbox?: [number, number, number, number];
      confidence?: number;
    }>;
  }>;
};

/** True when `x` is shaped like an OcrRequest.structuredLayout payload
 *  (pages[].blocks[] with at least one bbox-bearing block). The deliver
 *  route uses this to decide whether to take the OCR overlay path. */
export function isOcrLayoutShape(x: unknown): x is OcrStructuredLayout {
  if (!x || typeof x !== "object") return false;
  const obj = x as { pages?: unknown };
  if (!Array.isArray(obj.pages) || obj.pages.length === 0) return false;
  for (const p of obj.pages as Array<{ blocks?: unknown }>) {
    if (!p || typeof p !== "object") return false;
    if (!Array.isArray(p.blocks)) return false;
  }
  // Require at least one block somewhere with a bbox so we know we can
  // actually overlay; pure text-only OCR layouts (no positional data)
  // can't drive the layout-preserving renderer and should fall back.
  for (const p of obj.pages as Array<{ blocks?: Array<{ bbox?: unknown }> }>) {
    for (const b of p.blocks ?? []) {
      if (Array.isArray(b.bbox) && b.bbox.length === 4) return true;
    }
  }
  return false;
}

/**
 * Layout-preserving translation overlay for OCR-derived projects.
 *
 * Rasterises the original scanned PDF (or single image) page-by-page and
 * draws each translated segment back into the bounding box reported by
 * the OCR engine, using `OcrRequest.structuredLayout`. Output is a PDF
 * whose pages look like the original scan with translated text in place
 * of the original characters.
 *
 * @param sourcePath        Absolute path to the original scanned PDF or image
 * @param structuredLayout  OcrRequest.structuredLayout payload
 * @param srcToTranslation  Map of source-text → translation
 * @param targetLanguage    e.g. "Arabic" / "ar" — used for RTL handling
 * @param sourceMimeType    e.g. "application/pdf" / "image/png" — when
 *                          unspecified the file extension is used
 */
export async function applyOcrTranslationsToPdf(
  sourcePath: string,
  structuredLayout: OcrStructuredLayout,
  srcToTranslation: Map<string, string>,
  targetLanguage: string,
  sourceMimeType: string | null = null,
): Promise<Buffer> {
  const tmpDir = join(tmpdir(), `apply_ocr_${randomUUID()}`);
  await mkdir(tmpDir, { recursive: true });

  const layoutPath = join(tmpDir, "layout.json");
  const translationsPath = join(tmpDir, "translations.json");
  const outputPdfPath = join(tmpDir, "output.pdf");

  await writeFile(
    layoutPath,
    JSON.stringify(structuredLayout, null, 2),
    "utf-8",
  );

  const translationsObj: Record<string, string> = {};
  for (const [src, tgt] of srcToTranslation.entries()) {
    translationsObj[src] = tgt;
  }
  await writeFile(
    translationsPath,
    JSON.stringify(translationsObj, null, 2),
    "utf-8",
  );

  try {
    const { stdout, stderr } = await execAsync(
      `${PYTHON_BIN} "${APPLY_OCR_SCRIPT}" "${sourcePath}" "${layoutPath}" "${translationsPath}" "${outputPdfPath}" "${targetLanguage}" "${sourceMimeType ?? ""}"`,
      { maxBuffer: 32 * 1024 * 1024, timeout: 90_000 },
    );
    if (stderr) console.log("[applyOcrTranslationsToPdf] info:", stderr.slice(0, 400));
    try {
      const result = JSON.parse(stdout);
      console.log(
        "[applyOcrTranslationsToPdf] blocks_replaced:",
        result.blocks_replaced,
      );
    } catch {
      /* stdout may be empty on success; the file is what matters */
    }
    return await readFile(outputPdfPath);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Directly edit the original PDF with PyMuPDF:
 * — keeps every non-text element (images, graphics, backgrounds, borders)
 * — covers each translated text block with a background-matched rectangle
 * — redraws the translated text at the exact same position and font size
 *
 * This is the highest-quality layout-preserving path because it never loses
 * any visual element from the source file.
 */
export async function applyTranslationsToPdf(
  originalPdfPath: string,
  srcToTranslation: Map<string, string>,
  targetLanguage: string
): Promise<Buffer> {
  const tmpDir = join(tmpdir(), `apply_${randomUUID()}`);
  await mkdir(tmpDir, { recursive: true });

  const translationsPath = join(tmpDir, "translations.json");
  const outputPdfPath = join(tmpDir, "output.pdf");

  // Write translations to a temp JSON file
  const translationsObj: Record<string, string> = {};
  for (const [src, tgt] of srcToTranslation.entries()) {
    translationsObj[src] = tgt;
  }
  await writeFile(translationsPath, JSON.stringify(translationsObj, null, 2), "utf-8");

  try {
    const { stdout, stderr } = await execAsync(
      `${PYTHON_BIN} "${APPLY_SCRIPT}" "${originalPdfPath}" "${translationsPath}" "${outputPdfPath}" "${targetLanguage}"`,
      { maxBuffer: 32 * 1024 * 1024, timeout: 60_000 }
    );
    if (stderr) console.log("[applyTranslationsToPdf] info:", stderr.slice(0, 300));
    const result = JSON.parse(stdout);
    console.log("[applyTranslationsToPdf] blocks_replaced:", result.blocks_replaced);
    return await readFile(outputPdfPath);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

// ─── PPTX pipeline ────────────────────────────────────────────────────────────

const EXTRACT_PPTX_SCRIPT = join(process.cwd(), "scripts", "extract_pptx.py");
const APPLY_PPTX_SCRIPT = join(process.cwd(), "scripts", "apply_pptx_translations.py");

export type PptxSegment = {
  slideIndex: number;
  shapeIndex: number;
  paragraphIndex: number;
  text: string;
  formatHint: "h1" | "h2" | "h3" | "p" | "li";
};

export type PptxExtracted = {
  segments: PptxSegment[];
  slideCount: number;
  language: string;
};

/** Save a Next.js File object (pptx) to a temp path and return the path. */
export async function saveTmpPptx(file: File): Promise<string> {
  const tmpPath = join(tmpdir(), `doc_${randomUUID()}.pptx`);
  await writeFile(tmpPath, Buffer.from(await file.arrayBuffer()));
  return tmpPath;
}

/** Extract translatable segments from a PPTX file using python-pptx. */
export async function extractPptxStructured(pptxPath: string): Promise<PptxExtracted> {
  const { stdout, stderr } = await execAsync(
    `${PYTHON_BIN} "${EXTRACT_PPTX_SCRIPT}" "${pptxPath}"`,
    { maxBuffer: 16 * 1024 * 1024, timeout: 30_000 }
  );
  if (stderr) console.warn("[extractPptxStructured] stderr:", stderr.slice(0, 300));
  return JSON.parse(stdout) as PptxExtracted;
}

/**
 * Apply translations back into a PPTX file.
 * Preserves all formatting, slide layout, images, and design elements.
 * Only the text content of matching paragraphs is replaced.
 */
export async function applyTranslationsToPptx(
  originalPptxPath: string,
  srcToTranslation: Map<string, string>,
  targetLanguage: string
): Promise<Buffer> {
  const tmpDir = join(tmpdir(), `apply_pptx_${randomUUID()}`);
  await mkdir(tmpDir, { recursive: true });

  const translationsPath = join(tmpDir, "translations.json");
  const outputPptxPath = join(tmpDir, "output.pptx");

  const translationsObj: Record<string, string> = {};
  for (const [src, tgt] of srcToTranslation.entries()) {
    translationsObj[src] = tgt;
  }
  await writeFile(translationsPath, JSON.stringify(translationsObj, null, 2), "utf-8");

  try {
    const { stdout, stderr } = await execAsync(
      `${PYTHON_BIN} "${APPLY_PPTX_SCRIPT}" "${originalPptxPath}" "${translationsPath}" "${outputPptxPath}" "${targetLanguage}"`,
      { maxBuffer: 32 * 1024 * 1024, timeout: 60_000 }
    );
    if (stderr) console.log("[applyTranslationsToPptx] info:", stderr.slice(0, 300));
    const result = JSON.parse(stdout);
    console.log("[applyTranslationsToPptx] paragraphs_replaced:", result.paragraphs_replaced);
    return await readFile(outputPptxPath);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

const PPTX_STORAGE_DIR = join(process.cwd(), "storage", "pptx");

/** Persist a PPTX temp file to stable storage (avoids EXDEV cross-device issues). */
export async function persistPptx(tmpPath: string): Promise<string> {
  const { copyFile } = await import("fs/promises");
  await mkdir(PPTX_STORAGE_DIR, { recursive: true });
  const dest = join(PPTX_STORAGE_DIR, `${randomUUID()}.pptx`);
  await copyFile(tmpPath, dest);
  return dest;
}

const PDFTOHTML_BIN = findBin("pdftohtml");

/**
 * Convert a PDF to a self-contained positioned HTML string.
 * Background images (PNG page renders) are embedded as base64 data URIs
 * so the HTML is fully standalone and can be stored in the database.
 */
export async function extractPdfLayoutHtml(pdfPath: string): Promise<string> {
  const dir = join(tmpdir(), `pdflayout_${randomUUID()}`);
  await mkdir(dir, { recursive: true });

  try {
    const outBase = join(dir, "doc");
    await execAsync(
      `${PDFTOHTML_BIN} -s -noframes -enc UTF-8 "${pdfPath}" "${outBase}" 2>/dev/null`
    );

    const htmlPath = `${outBase}.html`;
    let html = await readFile(htmlPath, "utf-8");

    // Embed all referenced PNG images as base64 data URIs
    const imgRe = /src="([^"]+\.png)"/gi;
    let match: RegExpExecArray | null;
    const replacements: Array<[string, string]> = [];

    while ((match = imgRe.exec(html)) !== null) {
      const imgName = match[1];
      const imgPath = join(dir, imgName);
      try {
        const imgBuf = await readFile(imgPath);
        const b64 = imgBuf.toString("base64");
        replacements.push([match[0], `src="data:image/png;base64,${b64}"`]);
      } catch {
        /* skip missing images */
      }
    }

    for (const [from, to] of replacements) {
      html = html.replaceAll(from, to);
    }

    return html;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Decode HTML entities (basic set) */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#160;/g, " ")
    .replace(/&nbsp;/g, " ");
}

/** Strip inner HTML tags, returning plain text */
function innerText(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

/**
 * Given the self-contained positioned HTML from extractPdfLayoutHtml and a
 * source→target translation map, replace every text node with its translation
 * and return a PDF buffer.
 *
 * The background image (containing boxes, logos, design elements) is preserved
 * intact; only the text overlays are swapped.
 */
export async function generateTranslatedPdf(
  layoutHtml: string,
  translationMap: Map<string, string>,
  targetLanguage: string
): Promise<Buffer> {
  const rtl = isRtlLanguage(targetLanguage);

  // Build a normalised lookup: normalise(sourceText) → translatedText
  const lookup = new Map<string, string>();
  for (const [src, tgt] of translationMap.entries()) {
    const key = src.replace(/\s+/g, " ").trim().toLowerCase();
    if (key) lookup.set(key, tgt);
  }

  console.log("[generateTranslatedPdf] lookup size:", lookup.size, "| layoutHtml length:", layoutHtml.length);

  // Parse CSS class → text color from <style> blocks so we can pick the right
  // background cover colour for each translated element.
  const classColorMap = new Map<string, string>();
  const styleBlocks = layoutHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  for (const block of styleBlocks) {
    const rules = block[1].matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g);
    for (const rule of rules) {
      const cls = rule[1];
      const colorMatch = rule[2].match(/color\s*:\s*(#[0-9a-fA-F]{3,6}|rgb[^;]*)/i);
      if (colorMatch) classColorMap.set(cls, colorMatch[1].toLowerCase());
    }
  }

  /** Return true when the hex colour is perceived as "light" (needs dark bg cover). */
  function isLightColor(hex: string): boolean {
    const c = hex.replace("#", "");
    if (c.length < 6) return false;
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    // Relative luminance (simplified)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 160;
  }

  /**
   * Given a <p> open-tag string, pick the right cover background so that
   * the translated text cleanly hides the original burned-in image text.
   * Dark text → white cover; Light/white text → dark cover inferred from
   * the page background colour of the surrounding div.
   */
  function coverBg(openTag: string): string {
    const clsMatch = openTag.match(/class="([^"]+)"/i);
    if (clsMatch) {
      for (const cls of clsMatch[1].split(/\s+/)) {
        const color = classColorMap.get(cls);
        if (color && color.startsWith("#") && isLightColor(color)) {
          // Light (near-white) text — cover with a near-black background
          return "rgba(0,0,0,0.82)";
        }
      }
    }
    // Default: white cover for dark-on-light text (vast majority of cases)
    return "rgba(255,255,255,0.95)";
  }

  let replaceCount = 0;
  // Replace text content of every <p ...>…</p> block
  let html = layoutHtml.replace(
    /(<p\b[^>]*>)([\s\S]*?)(<\/p>)/gi,
    (fullMatch, openTag, innerHtml, closeTag) => {
      const source = innerText(innerHtml);
      if (!source) return fullMatch;

      const key = source.toLowerCase();
      let translated = lookup.get(key) ?? null;

      // Fallback: partial prefix match (handles slight mismatches)
      if (!translated) {
        for (const [k, v] of lookup.entries()) {
          if (k.startsWith(key.slice(0, Math.max(10, key.length - 5))) || key.startsWith(k.slice(0, Math.max(10, k.length - 5)))) {
            translated = v;
            break;
          }
        }
      }

      if (!translated) return fullMatch;

      replaceCount++;

      // Background cover to hide the original burned-in image text
      const bg = coverBg(openTag);
      const coverStyle = `background-color:${bg};padding:1px 3px;`;

      // Preserve <br/> line breaks: split translated text the same way the
      // source had line breaks and rejoin with <br/>
      const brCount = (innerHtml.match(/<br/gi) ?? []).length;
      let newInner: string;
      if (brCount > 0) {
        // Split translated text into same number of lines
        const words = translated.split(/\s+/);
        const chunkSize = Math.ceil(words.length / (brCount + 1));
        const lines: string[] = [];
        for (let i = 0; i <= brCount; i++) {
          lines.push(words.slice(i * chunkSize, (i + 1) * chunkSize).join(" "));
        }
        newInner = lines.filter(Boolean).join("<br/>");
      } else {
        newInner = escapeHtml(translated);
      }

      // Inject background cover + optional RTL direction into the element's style
      const rtlInlineStyle = rtl
        ? "direction:rtl;text-align:right;unicode-bidi:embed;"
        : "";
      const finalOpen = openTag.replace(
        /style="([^"]*)"/i,
        (_, existing) => {
          const base = `${existing};${coverStyle}${rtlInlineStyle}`;
          return `style="${base}"`;
        }
      );

      // If the <p> had no style attribute at all, add one
      const tagWithStyle = finalOpen.includes("style=")
        ? finalOpen
        : openTag.replace(
            "<p",
            `<p style="${coverStyle}${rtlInlineStyle}"`
          );

      return `${tagWithStyle}${newInner}${closeTag}`;
    }
  );

  // Inject RTL font and direction for Arabic/RTL targets using embedded font data.
  // Use the universal "*" selector so it wins over pdftohtml's class-based
  // font-family rules (e.g. .ft10{font-family:AAAAAA+Times}) even without !important.
  if (rtl) {
    const { css: fontFaceCss, fontFamily: rtlFontFamily } = await buildFontFaceBlock(true);
    const rtlStyle = `<style>
${fontFaceCss}
* { font-family: ${rtlFontFamily} !important; }
html, body { direction: rtl; }
p, span, div, td, th { direction: rtl; unicode-bidi: embed; }
</style>`;
    html = html.replace("</head>", `${rtlStyle}\n</head>`);
    // Set dir="rtl" on the <html> element itself
    html = html.replace(/(<html)(\s[^>]*)?>/i, (_, tag, attrs) => {
      const cleanAttrs = (attrs ?? "").replace(/\bdir="[^"]*"/gi, "");
      return `${tag}${cleanAttrs} dir="rtl">`;
    });
  }

  console.log("[generateTranslatedPdf] text replacements made:", replaceCount);

  const puppeteer = (await import("puppeteer-core")).default;
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_BIN,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    // Fonts embedded as data URIs — domcontentloaded is sufficient.
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 400));

    // Detect page size from the positioned div
    const pageSize = await page.evaluate(() => {
      const div = document.querySelector("[id^='page']") as HTMLElement | null;
      if (div) {
        return { width: div.style.width || "595px", height: div.style.height || "841px" };
      }
      return { width: "595px", height: "841px" };
    });

    const pdfBytes = await page.pdf({
      width: pageSize.width,
      height: pageSize.height,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}

const RTL_LANGS = [
  "arabic", "hebrew", "urdu", "farsi", "persian",
  "ar", "he", "ur", "fa", "pus", "syr", "thaana",
];

export function isRtlLanguage(lang: string): boolean {
  return RTL_LANGS.some((l) => lang.toLowerCase().includes(l));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build the delivery HTML and render it to a PDF buffer via Puppeteer + Chromium.
 * The PDF preserves the original document structure (headings, lists, tables)
 * via the formatHint field, uses correct RTL/LTR direction, and
 * locally-embedded Noto fonts for broad language coverage — no network required.
 */
export async function generateDeliveryPdf(opts: {
  segments: Array<{ sourceText: string; translatedText: string | null; formatHint?: string }>;
  targetLanguage: string;
  documentTitle: string;
  pageSize?: { width: string; height: string };
}): Promise<Buffer> {
  const {
    segments,
    targetLanguage,
    documentTitle,
    pageSize = { width: "210mm", height: "297mm" },
  } = opts;

  const rtl = isRtlLanguage(targetLanguage);
  const { css: fontFaceCss, fontFamily } = await buildFontFaceBlock(rtl);
  const textAlign = rtl ? "right" : "justify";

  // Expand markdown headings + tables out of any "p" segments that
  // Mistral OCR produced (single segment containing the full pipe table)
  // so the renderer below can emit real <h*> and <table> elements.
  const renderSegments = expandMarkdownSegments(segments);

  function cellText(s: { sourceText: string; translatedText: string | null }): string {
    return escapeHtml((s.translatedText ?? s.sourceText).trim());
  }

  /** Walk the expanded segment list once, emitting HTML. Consecutive
   *  th/td segments belonging to the same table id are collected into
   *  a single <table>; consecutive li segments are wrapped in a <ul>. */
  function buildBody(segs: typeof renderSegments): string {
    const out: string[] = [];
    let i = 0;
    while (i < segs.length) {
      const seg = segs[i];
      const cell = parseCellHint(seg.formatHint);

      // Table — collect all subsequent cells with the same table id
      if (cell) {
        const tId = cell.tableId;
        const headerCells: string[] = [];
        const bodyRows: Map<number, string[]> = new Map();
        while (i < segs.length) {
          const c = parseCellHint(segs[i].formatHint);
          if (!c || c.tableId !== tId) break;
          if (c.kind === "th") {
            headerCells[c.col] = cellText(segs[i]);
          } else {
            const row = bodyRows.get(c.row) ?? [];
            row[c.col] = cellText(segs[i]);
            bodyRows.set(c.row, row);
          }
          i++;
        }
        const colCount = Math.max(
          headerCells.length,
          ...Array.from(bodyRows.values()).map((r) => r.length),
          1,
        );
        const thead = headerCells.length
          ? `<thead><tr>${Array.from({ length: colCount }, (_, c) => `<th>${headerCells[c] ?? ""}</th>`).join("")}</tr></thead>`
          : "";
        const sortedRows = Array.from(bodyRows.entries()).sort((a, b) => a[0] - b[0]);
        const tbody = sortedRows.length
          ? `<tbody>${sortedRows
              .map(
                ([, r]) =>
                  `<tr>${Array.from({ length: colCount }, (_, c) => `<td>${r[c] ?? ""}</td>`).join("")}</tr>`,
              )
              .join("")}</tbody>`
          : "";
        out.push(`<table class="tbl">${thead}${tbody}</table>`);
        continue;
      }

      // List items — collect consecutive li's into one <ul>
      if (seg.formatHint === "li") {
        const items: string[] = [];
        while (i < segs.length && segs[i].formatHint === "li") {
          items.push(`<li class="li">${cellText(segs[i])}</li>`);
          i++;
        }
        out.push(`<ul class="ul">${items.join("")}</ul>`);
        continue;
      }

      // Single block
      const safe = cellText(seg);
      const hint = seg.formatHint ?? "p";
      switch (hint) {
        case "h1": out.push(`<h1 class="h1">${safe}</h1>`); break;
        case "h2": out.push(`<h2 class="h2">${safe}</h2>`); break;
        case "h3": out.push(`<h3 class="h3">${safe}</h3>`); break;
        // Legacy plain "th"/"td" hints (e.g. from structuredToSegments)
        // — fall back to the previous div-based table styling.
        case "th": out.push(`<div class="th">${safe}</div>`); break;
        case "td": out.push(`<div class="td">${safe}</div>`); break;
        default:   out.push(`<p class="p">${safe}</p>`);
      }
      i++;
    }
    return out.join("\n    ");
  }

  const bodySegments = buildBody(renderSegments);

  const html = `<!DOCTYPE html>
<html dir="${rtl ? "rtl" : "ltr"}">
<head>
  <meta charset="UTF-8">
  <style>
    ${fontFaceCss}
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFamily};
      font-size: 11pt;
      line-height: 1.72;
      color: #1a2e3a;
      background: #fff;
      direction: ${rtl ? "rtl" : "ltr"};
    }
    .page { padding: 54pt 66pt 48pt; }
    .hdr {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12pt;
      border-bottom: 2.5px solid #0091AE;
      padding-bottom: 14pt;
      margin-bottom: 28pt;
    }
    .hdr-text { flex: 1; }
    .doc-title {
      font-size: 14.5pt;
      font-weight: 700;
      color: #33475B;
      line-height: 1.25;
      margin-bottom: 3pt;
    }
    .doc-meta { font-size: 9pt; color: #99ACC2; }
    .logo {
      font-size: 11.5pt;
      font-weight: 700;
      color: #0091AE;
      white-space: nowrap;
      padding-top: 2pt;
    }
    /* Document body styles */
    .h1 {
      font-size: 16pt;
      font-weight: 700;
      color: #33475B;
      margin: 20pt 0 8pt;
      line-height: 1.3;
      text-align: ${rtl ? "right" : "left"};
      border-bottom: 1.5px solid #CBD6E2;
      padding-bottom: 4pt;
    }
    .h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #33475B;
      margin: 16pt 0 6pt;
      line-height: 1.3;
      text-align: ${rtl ? "right" : "left"};
    }
    .h3 {
      font-size: 11.5pt;
      font-weight: 600;
      color: #516F90;
      margin: 12pt 0 5pt;
      line-height: 1.35;
      text-align: ${rtl ? "right" : "left"};
    }
    .p { margin-bottom: 9pt; text-align: ${textAlign}; }
    .ul {
      margin: 4pt 0 9pt;
      padding-${rtl ? "right" : "left"}: 18pt;
    }
    .li { margin-bottom: 4pt; text-align: ${textAlign}; }
    .th {
      background: #F5F8FA;
      font-weight: 600;
      padding: 5pt 8pt;
      border: 1px solid #CBD6E2;
      margin-bottom: 2pt;
      text-align: ${rtl ? "right" : "left"};
    }
    .td {
      padding: 4pt 8pt;
      border: 1px solid #CBD6E2;
      border-top: none;
      margin-bottom: 2pt;
      text-align: ${textAlign};
    }
    .tbl {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0 16pt;
      font-size: 10.5pt;
    }
    .tbl th {
      background: #F5F8FA;
      color: #33475B;
      font-weight: 700;
      text-align: ${rtl ? "right" : "left"};
      padding: 6pt 8pt;
      border: 1px solid #CBD6E2;
    }
    .tbl td {
      padding: 5pt 8pt;
      border: 1px solid #CBD6E2;
      color: #1a2e3a;
      text-align: ${rtl ? "right" : "left"};
      vertical-align: top;
    }
    .tbl tr:nth-child(even) td { background: #FAFBFC; }
    .ftr {
      margin-top: 40pt;
      padding-top: 10pt;
      border-top: 1px solid #CBD6E2;
      font-size: 8pt;
      color: #99ACC2;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="hdr">
      <div class="hdr-text">
        <div class="doc-title">${escapeHtml(documentTitle)}</div>
        <div class="doc-meta">Translated to ${escapeHtml(targetLanguage)} by Contentech</div>
      </div>
      <div class="logo">Contentech</div>
    </div>
    ${bodySegments}
    <div class="ftr">
      Translated by Contentech Translation Platform &middot; contentech.com
    </div>
  </div>
</body>
</html>`;

  const puppeteer = (await import("puppeteer-core")).default;

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_BIN,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    // Fonts are embedded as data URIs — no network needed; domcontentloaded is enough.
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15000 });
    // Give the font engine a moment to apply embedded @font-face rules.
    await new Promise((r) => setTimeout(r, 400));
    const pdfBytes = await page.pdf({
      width: pageSize.width,
      height: pageSize.height,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}

// ─── DOCX generation ─────────────────────────────────────────────────────────

/**
 * Generate a DOCX buffer from translated segments.
 * Uses the `docx` package for first-class OOXML output — supports RTL,
 * headings, lists, and correct Arabic text direction out-of-the-box.
 */
export async function generateDocx(opts: {
  segments: Array<{ sourceText: string; translatedText: string | null; formatHint?: string }>;
  targetLanguage: string;
  documentTitle: string;
}): Promise<Buffer> {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
    convertInchesToTwip,
  } = await import("docx");

  const { segments: rawSegments, targetLanguage, documentTitle } = opts;
  const rtl = isRtlLanguage(targetLanguage);

  // Expand markdown headings + tables out of any "p" segments that
  // Mistral OCR produced as a single block of pipe syntax. Without this
  // the loop below would write `| العنصر | الإدخال | ... |` as plain
  // text into a single paragraph instead of a real Word table.
  const segments = expandMarkdownSegments(rawSegments);

  const textAlign = rtl ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED;
  const bidirectional = rtl;

  // Arabic/RTL: must specify w:cs (complex-script font slot) — Word uses that
  // slot for Arabic/Hebrew shaping. A plain string sets only w:ascii, which
  // Word ignores for RTL text, leaving it to fall back to Calibri (no Arabic
  // glyphs) and producing garbled output.
  const rtlFont = rtl
    ? { name: "Arial Unicode MS", cs: "Arial Unicode MS", hint: "cs" as const }
    : undefined;

  function makeTextRun(text: string) {
    return new TextRun({
      text,
      font: rtlFont,
    });
  }

  function makeTableCell(text: string, header: boolean) {
    return new TableCell({
      shading: header
        ? { type: ShadingType.SOLID, color: "F5F8FA", fill: "F5F8FA" }
        : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [
        new Paragraph({
          bidirectional,
          alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [
            new TextRun({
              text,
              bold: header,
              color: header ? "33475B" : "1A2E3A",
              font: rtlFont,
            }),
          ],
        }),
      ],
    });
  }

  function makeTable(headerCells: string[], rows: string[][]): InstanceType<typeof Table> {
    const colCount = Math.max(headerCells.length, ...rows.map((r) => r.length), 1);
    const allRows: InstanceType<typeof TableRow>[] = [];
    if (headerCells.length) {
      allRows.push(
        new TableRow({
          tableHeader: true,
          children: Array.from({ length: colCount }, (_, c) =>
            makeTableCell(headerCells[c] ?? "", true),
          ),
        }),
      );
    }
    for (const row of rows) {
      allRows.push(
        new TableRow({
          children: Array.from({ length: colCount }, (_, c) =>
            makeTableCell(row[c] ?? "", false),
          ),
        }),
      );
    }
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 4, color: "CBD6E2" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD6E2" },
        left:   { style: BorderStyle.SINGLE, size: 4, color: "CBD6E2" },
        right:  { style: BorderStyle.SINGLE, size: 4, color: "CBD6E2" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "CBD6E2" },
        insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: "CBD6E2" },
      },
      rows: allRows,
    });
  }

  const titlePara = new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
    bidirectional,
    children: [makeTextRun(documentTitle)],
  });

  // Body children may be Paragraphs or Tables (mixed, in order).
  const bodyChildren: Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> = [];

  let listItems: string[] = [];
  function flushList() {
    if (listItems.length === 0) return;
    for (const item of listItems) {
      bodyChildren.push(
        new Paragraph({
          bullet: { level: 0 },
          alignment: textAlign,
          bidirectional,
          children: [makeTextRun(item)],
        })
      );
    }
    listItems = [];
  }

  let i = 0;
  while (i < segments.length) {
    const seg = segments[i];
    const text = (seg.translatedText ?? seg.sourceText).trim();
    const hint = seg.formatHint ?? "p";

    // Table cells — collect all consecutive segments belonging to the
    // same table id, then emit one DOCX Table.
    const cell = parseCellHint(hint);
    if (cell) {
      flushList();
      const tId = cell.tableId;
      const headerCells: string[] = [];
      const bodyRowsMap = new Map<number, string[]>();
      while (i < segments.length) {
        const c = parseCellHint(segments[i].formatHint);
        if (!c || c.tableId !== tId) break;
        const cellTxt = (segments[i].translatedText ?? segments[i].sourceText).trim();
        if (c.kind === "th") {
          headerCells[c.col] = cellTxt;
        } else {
          const row = bodyRowsMap.get(c.row) ?? [];
          row[c.col] = cellTxt;
          bodyRowsMap.set(c.row, row);
        }
        i++;
      }
      const sortedRows = Array.from(bodyRowsMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, r]) => r);
      bodyChildren.push(makeTable(headerCells, sortedRows));
      // DOCX requires a paragraph between consecutive tables and at the
      // end of a section. Add a thin spacer.
      bodyChildren.push(
        new Paragraph({
          alignment: textAlign,
          bidirectional,
          spacing: { after: convertInchesToTwip(0.05) },
          children: [makeTextRun("")],
        }),
      );
      continue;
    }

    if (!text) {
      i++;
      continue;
    }

    if (hint !== "li") flushList();

    switch (hint) {
      case "h1":
        bodyChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            bidirectional,
            children: [makeTextRun(text)],
          })
        );
        break;
      case "h2":
        bodyChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            bidirectional,
            children: [makeTextRun(text)],
          })
        );
        break;
      case "h3":
        bodyChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            bidirectional,
            children: [makeTextRun(text)],
          })
        );
        break;
      case "li":
        listItems.push(text);
        break;
      // Legacy single "th"/"td" hints (e.g. from structuredToSegments)
      // are emitted as bold/plain paragraphs as a graceful fallback.
      case "th":
      case "td":
        bodyChildren.push(
          new Paragraph({
            alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            bidirectional,
            spacing: { after: convertInchesToTwip(0.05) },
            children: [
              new TextRun({
                text,
                bold: hint === "th",
                font: rtl ? "Arial Unicode MS" : undefined,
              }),
            ],
          })
        );
        break;
      default:
        bodyChildren.push(
          new Paragraph({
            alignment: textAlign,
            bidirectional,
            spacing: { after: convertInchesToTwip(0.1) },
            children: [makeTextRun(text)],
          })
        );
    }
    i++;
  }
  flushList();

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1.25),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
            },
          },
        },
        children: [titlePara, ...bodyChildren],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// ─── In-place DOCX translation ────────────────────────────────────────────────

/**
 * Translate a DOCX file in-place by swapping text runs inside the XML while
 * leaving all formatting, tables, images, and structure untouched.
 *
 * Algorithm per paragraph (<w:p>):
 *  1. Concatenate all <w:t> text content → source text
 *  2. Look up in srcToTranslation (normalised whitespace)
 *  3. Put translated text in the FIRST <w:t>, clear all subsequent <w:t>
 *     → keeps run formatting (bold/italic/size/colour) from the first run,
 *       table borders/shading/widths are completely untouched.
 *  4. For RTL languages, inject <w:bidi/> and right-align when absent.
 */
export async function translateDocxInPlace(
  originalDocxPath: string,
  srcToTranslation: Map<string, string>,
  targetLanguage: string,
): Promise<Buffer> {
  const JSZip = (await import("jszip")).default;
  const rtl = isRtlLanguage(targetLanguage);

  const originalBytes = await readFile(originalDocxPath);
  const zip = await JSZip.loadAsync(originalBytes);

  // Build a normalised lookup for fuzzy whitespace matching
  const normMap = new Map<string, string>();
  for (const [src, trg] of srcToTranslation) {
    normMap.set(src.replace(/\s+/g, " ").trim(), trg);
  }

  function xmlEsc(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Walk every <w:p> in the XML string and replace text runs.
   * Handles paragraphs inside table cells, text boxes, etc. automatically.
   */
  function translateXml(xml: string): string {
    return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (paraXml) => {
      // Collect all <w:t> text content in order
      const wtRe = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      const texts: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = wtRe.exec(paraXml)) !== null) texts.push(m[1]);

      const sourceText = texts.join("").replace(/\s+/g, " ").trim();
      if (!sourceText) return paraXml;

      const translation = normMap.get(sourceText);
      if (!translation) return paraXml;

      // Replace: first <w:t> → translated text; rest → empty
      let isFirst = true;
      let out = paraXml.replace(/<w:t[^>]*>[^<]*<\/w:t>/g, () => {
        if (isFirst) {
          isFirst = false;
          return `<w:t xml:space="preserve">${xmlEsc(translation)}</w:t>`;
        }
        return "<w:t/>";
      });

      // Ensure RTL paragraph + run properties are present
      if (rtl) {
        // 1. Paragraph-level bidi (controls paragraph direction)
        if (!out.includes("<w:bidi")) {
          if (out.includes("<w:pPr>")) {
            out = out.replace("<w:pPr>", "<w:pPr><w:bidi/>");
          } else {
            out = out.replace(/(<w:p[ >][^<]*)(<w:r[ >]|<w:ins[ >]|<\/w:p>)/, "$1<w:pPr><w:bidi/></w:pPr>$2");
          }
        }
        // 2. Right-align the paragraph
        if (!out.includes('<w:jc ')) {
          out = out.replace("<w:pPr>", '<w:pPr><w:jc w:val="right"/>');
        }
        // 3. Run-level RTL fixes:
        //    a) <w:rtl/> — without this Word treats each run as LTR even
        //       inside an RTL paragraph, breaking cursor movement.
        //    b) <w:rFonts w:ascii="Arial Unicode MS" w:cs="Arial Unicode MS"
        //       w:hint="cs"/> — Word uses the w:cs slot for Arabic/Hebrew
        //       shaping. The source font (e.g. Calibri) has no Arabic glyphs,
        //       so we must replace it. A plain w:ascii-only font tag is also
        //       ignored for RTL text — w:cs is required.
        const RTL_RFONTS = '<w:rFonts w:ascii="Arial Unicode MS" w:cs="Arial Unicode MS" w:hAnsi="Arial Unicode MS" w:hint="cs"/>';
        out = out.replace(/<w:r(\s[^>]*)?>[\s\S]*?<\/w:r>/g, (runXml) => {
          // Skip bookmark/proof runs that have no <w:t>
          if (!runXml.includes("<w:t")) return runXml;

          let r = runXml;

          // --- inject <w:rtl/> ---
          if (!r.includes("<w:rtl")) {
            if (r.includes("<w:rPr>")) {
              r = r.replace("<w:rPr>", "<w:rPr><w:rtl/>");
            } else {
              r = r.replace(/(<w:r(?:\s[^>]*)?>)/, "$1<w:rPr><w:rtl/></w:rPr>");
            }
          }

          // --- replace or inject <w:rFonts> with Arabic-capable font ---
          if (r.includes("<w:rFonts")) {
            // Replace whatever font the source doc specified
            r = r.replace(/<w:rFonts[^/]*\/>/g, RTL_RFONTS);
          } else if (r.includes("<w:rPr>")) {
            r = r.replace("<w:rPr>", `<w:rPr>${RTL_RFONTS}`);
          }

          return r;
        });
      }

      return out;
    });
  }

  // Translate the main document body
  const docEntry = zip.file("word/document.xml");
  if (docEntry) {
    const xml = await docEntry.async("string");
    zip.file("word/document.xml", translateXml(xml));
  }

  // Translate headers and footers too
  const entries = Object.keys(zip.files);
  for (const name of entries) {
    if (/^word\/(header|footer)\d*\.xml$/i.test(name)) {
      const entry = zip.file(name);
      if (entry) {
        const xml = await entry.async("string");
        zip.file(name, translateXml(xml));
      }
    }
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }) as Promise<Buffer>;
}

/**
 * Generates a DOCX with a two-column table: Source | Translation.
 * Used as a fallback when PDF layout cannot be preserved.
 */
export async function generateDocxTable(opts: {
  segments: Array<{ sourceText: string; translatedText: string | null; formatHint?: string }>;
  targetLanguage: string;
  documentTitle: string;
}): Promise<Buffer> {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
    convertInchesToTwip,
  } = await import("docx");

  const { segments, targetLanguage, documentTitle } = opts;
  const rtl = isRtlLanguage(targetLanguage);

  function cell(text: string, header = false, dir: "ltr" | "rtl" = "ltr") {
    // Must use object form { cs } so Word uses the complex-script font slot for
    // Arabic/Hebrew — a plain string only sets w:ascii which Word ignores for RTL text.
    const cellFont = dir === "rtl"
      ? { name: "Arial Unicode MS", cs: "Arial Unicode MS", hint: "cs" as const }
      : undefined;
    return new TableCell({
      shading: header ? { type: ShadingType.SOLID, color: "33475B", fill: "33475B" } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [
        new Paragraph({
          bidirectional: dir === "rtl",
          alignment: dir === "rtl" ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [
            new TextRun({
              text,
              bold: header,
              color: header ? "FFFFFF" : "33475B",
              font: cellFont,
            }),
          ],
        }),
      ],
    });
  }

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cell("Source Text", true, "ltr"),
      cell(`Translation (${targetLanguage})`, true, rtl ? "rtl" : "ltr"),
    ],
  });

  const dataRows = segments
    .filter((s) => (s.translatedText ?? s.sourceText).trim().length > 0)
    .map(
      (s) =>
        new TableRow({
          children: [
            cell(s.sourceText.trim(), false, "ltr"),
            cell((s.translatedText ?? s.sourceText).trim(), false, rtl ? "rtl" : "ltr"),
          ],
        })
    );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: "CBD6E2" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD6E2" },
      left:   { style: BorderStyle.SINGLE, size: 1, color: "CBD6E2" },
      right:  { style: BorderStyle.SINGLE, size: 1, color: "CBD6E2" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5EAF0" },
      insideVertical:   { style: BorderStyle.SINGLE, size: 1, color: "E5EAF0" },
    },
    columnWidths: [4000, 4000],
    rows: [headerRow, ...dataRows],
  });

  const titlePara = new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
    bidirectional: rtl,
    children: [new TextRun({ text: documentTitle })],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [titlePara, table],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
