import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeDocumentText } from "@/lib/ai-translate";
import {
  saveTmpPdf,
  saveTmpPptx,
  extractPptxStructured,
  persistPptx,
} from "@/lib/pdf-pipeline";
import { parseDocx, parsePlainText, segmentsToTexts, type Segment } from "@/lib/segment-parser";
import {
  extractPdf as extractPdfMicroservice,
  extractScannedPdf as extractScannedPdfMicroservice,
  PdfServiceError,
} from "@/lib/pdf-processor-client";
import {
  buildOcrEnrichment,
  getOcrProvider,
  getOcrConfidenceThreshold,
  type OcrEnrichment,
} from "@/lib/ocr-pipeline";
import { unlink, copyFile, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { toStorageUrl } from "@/lib/storage-path";

const IMAGE_STORAGE_DIR = join(process.cwd(), "storage", "images");

function mimeForExt(ext: string): string {
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  return "application/octet-stream";
}

function clampConfidence(n: number | null | undefined): number | null {
  if (n === null || n === undefined) return null;
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

const PDF_STORAGE_DIR = join(process.cwd(), "storage", "pdfs");
const DOCX_STORAGE_DIR = join(process.cwd(), "storage", "docx");

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const filename = file.name;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  let segments: Segment[] = [];
  let layoutHtml: string | null = null;
  let structuredData: object | null = null;
  let scanned = false;
  let ocrConfidence: number | null = null;
  let ocrEnrichment: OcrEnrichment | null = null;
  let pdfTmpPath: string | null = null;
  let pdfStoredPath: string | null = null;
  let pptxTmpPath: string | null = null;
  let pptxStoredPath: string | null = null;
  let docxStoredPath: string | null = null;

  try {
    if (ext === "txt" || ext === "md") {
      const text = await file.text();
      segments = parsePlainText(text);
    } else if (ext === "docx") {
      const buffer = Buffer.from(await file.arrayBuffer());
      segments = await parseDocx(buffer);
      // ── Persist DOCX for layout-preserving in-place delivery ───────────────
      try {
        await mkdir(DOCX_STORAGE_DIR, { recursive: true });
        const storedName = `${randomUUID()}.docx`;
        const storedPath = join(DOCX_STORAGE_DIR, storedName);
        await writeFile(storedPath, buffer);
        docxStoredPath = storedPath;
        console.log("[analyze] DOCX persisted to:", docxStoredPath);
      } catch (err) {
        console.warn("[analyze] Failed to persist DOCX:", (err as Error)?.message);
      }
    } else if (ext === "pdf") {
      pdfTmpPath = await saveTmpPdf(file);
      const pdfBufForService = Buffer.from(await file.arrayBuffer());

      // ── Step 1: Persist PDF to storage (Mistral requires a file path) ──────
      try {
        await mkdir(PDF_STORAGE_DIR, { recursive: true });
        const storedName = `${randomUUID()}.pdf`;
        const candidatePath = join(PDF_STORAGE_DIR, storedName);
        await copyFile(pdfTmpPath!, candidatePath);
        pdfStoredPath = candidatePath;
        console.log("[analyze] PDF persisted to:", pdfStoredPath);
      } catch (err) {
        console.warn("[analyze] Failed to persist PDF:", (err as Error)?.message);
      }

      // ── Step 2: Run Mistral OCR + microservice extraction in parallel ──────
      // Mistral is the primary text source — returns rich markdown (headings,
      // tables, clean paragraphs). The microservice provides bounding-box data
      // needed for layout-preserving overlay delivery. Both run concurrently;
      // each failure is handled independently so one outage can't block the other.
      const ocrSourcePath = pdfStoredPath ?? pdfTmpPath;
      const mistralConfigured = Boolean(process.env.MISTRAL_API_KEY);

      type MsResult = Awaited<ReturnType<typeof extractPdfMicroservice>>;
      const [mistralOutcome, msOutcome] = await Promise.allSettled([
        mistralConfigured && ocrSourcePath
          ? buildOcrEnrichment(ocrSourcePath, null, "application/pdf")
          : Promise.reject(new Error("Mistral not configured")),
        extractPdfMicroservice(pdfBufForService) as Promise<MsResult>,
      ]);

      // ── Microservice result: always keep bboxes for overlay delivery ────────
      let microserviceBlocks: import("@/lib/pdf-processor-client").PdfBlock[] = [];
      if (msOutcome.status === "fulfilled") {
        const msResult = msOutcome.value;
        microserviceBlocks = msResult.blocks;
        structuredData = {
          pageCount: msResult.pageCount,
          blocks: msResult.blocks,
          nonTextElements: msResult.nonTextElements,
        };
        console.log("[analyze] Microservice extraction OK — blocks:", microserviceBlocks.length);
      } else {
        const msErr = msOutcome.reason as Error;
        if (msErr instanceof PdfServiceError) {
          // Service is completely unreachable — Mistral can still provide text
          // segments but layout delivery won't be possible without bboxes.
          console.warn("[analyze] pdf-processor unreachable (overlay delivery degraded):", msErr.message);
        } else {
          console.warn("[analyze] Microservice extraction failed:", msErr?.message);
        }
      }

      // ── Mistral result: primary text + segment source ───────────────────────
      if (mistralOutcome.status === "fulfilled") {
        ocrEnrichment = mistralOutcome.value;
        scanned = true;
        ocrConfidence = clampConfidence(ocrEnrichment.avgConfidence);
        const mistralText = (ocrEnrichment.extractedMarkdown || ocrEnrichment.extractedText || "").trim();
        if (mistralText) {
          segments = parsePlainText(mistralText);
        }
        console.log(
          "[analyze] Mistral OCR primary — provider:", ocrEnrichment.provider,
          "| segments:", segments.length,
          "| confidence:", ocrConfidence,
        );
      } else {
        const mistralErr = mistralOutcome.reason as Error;
        if (mistralConfigured) {
          console.warn("[analyze] Mistral OCR failed, falling back to microservice text:", mistralErr?.message);
        }
        // Fall back: build segments and enrichment from microservice blocks
        if (microserviceBlocks.length > 0) {
          const MIN_TEXT = 3;
          segments = microserviceBlocks
            .filter(b => b.text.trim().length >= MIN_TEXT)
            .map(b => ({
              text: b.text,
              formatHint: (b.blockType === "heading" ? "h1" : b.blockType === "table-cell" ? "td" : "p") as "h1" | "td" | "p",
              blockId:       b.blockId,
              blockType:     b.blockType,
              blockPage:     b.page,
              fontFamily:    b.fontFamily,
              fontSize:      b.fontSize,
              fontWeight:    b.fontWeight,
              fontColor:     b.fontColor,
              textAlignment: b.alignment,
              lineHeight:    b.lineHeight,
              bboxJson:      b.bbox,
              direction:     b.direction,
              columnIndex:   b.columnIndex,
              readingOrder:  b.readingOrder,
              tableId:       b.tableId,
              tableRow:      b.tableRow,
              tableCol:      b.tableCol,
            }));

          const pageNums = [...new Set(microserviceBlocks.map(b => b.page))].sort((a, b) => a - b);
          const nativePages = pageNums.map(pageNum => {
            const pageBlocks = microserviceBlocks.filter(b => b.page === pageNum);
            const text = pageBlocks.map(b => b.text).filter(t => t.trim()).join("\n\n");
            return {
              pageNum: pageNum + 1,
              text,
              markdown: null as null,
              mistralText: null as null,
              confidence: 1 as number,
              blocks: pageBlocks.map(b => ({
                text: b.text,
                bbox: [b.bbox.x, b.bbox.y, b.bbox.x + b.bbox.width, b.bbox.y + b.bbox.height] as [number, number, number, number],
                confidence: undefined as undefined,
              })),
            };
          });
          ocrEnrichment = {
            provider: "native-text",
            pages: nativePages,
            avgConfidence: 1,
            structuredLayout: null as any,
            extractedText: nativePages.map(p => p.text).join("\n\n"),
            extractedMarkdown: undefined,
          };
          ocrConfidence = 1;
          console.log("[analyze] Fallback: native-text from microservice — pages:", pageNums.length);
        } else {
          // Both Mistral and microservice failed — nothing to show
          return NextResponse.json({ error: "Failed to extract content from PDF." }, { status: 500 });
        }
      }
    } else if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp") {
      // Standalone image upload — route directly through OcrProvider.
      const buffer = Buffer.from(await file.arrayBuffer());
      try {
        await mkdir(IMAGE_STORAGE_DIR, { recursive: true });
        const storedName = `${randomUUID()}.${ext}`;
        const storedPath = join(IMAGE_STORAGE_DIR, storedName);
        await writeFile(storedPath, buffer);
        pdfStoredPath = storedPath; // re-use field; downstream just needs a path
        const provider = getOcrProvider();
        const result = await provider.extract({
          filePath: storedPath,
          mimeType: mimeForExt(ext),
        });
        scanned = true;
        ocrConfidence = clampConfidence(result.overallConfidence);
        ocrEnrichment = {
          provider: result.provider,
          pages: result.pages,
          avgConfidence: result.overallConfidence,
          structuredLayout: result.structuredLayout,
          extractedText: result.extractedText,
          extractedMarkdown: result.extractedMarkdown,
        };
        const text = result.extractedText.trim();
        if (text) {
          segments = parsePlainText(text);
        }
      } catch (err) {
        console.error("[analyze] image OCR failed:", (err as Error)?.message);
        return NextResponse.json(
          { error: "Could not extract text from this image. Try a different file or use the scanner first." },
          { status: 500 }
        );
      }
    } else if (ext === "pptx" || ext === "ppt") {
      pptxTmpPath = await saveTmpPptx(file);

      const extracted = await extractPptxStructured(pptxTmpPath).catch((err) => {
        console.error("[analyze] extractPptxStructured failed:", err?.message ?? err);
        return null;
      });

      if (extracted && extracted.segments.length > 0) {
        segments = extracted.segments.map((s) => ({
          text: s.text,
          formatHint: s.formatHint,
        })) as Segment[];

        console.log("[analyze] PPTX segments:", segments.length, "| slides:", extracted.slideCount);

        // Persist the PPTX for layout-preserving delivery
        try {
          pptxStoredPath = await persistPptx(pptxTmpPath!);
          console.log("[analyze] PPTX persisted to:", pptxStoredPath);
        } catch (err) {
          console.warn("[analyze] Failed to persist PPTX:", (err as Error)?.message);
        }
      } else {
        return NextResponse.json({ error: "Could not extract content from the presentation." }, { status: 500 });
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, DOCX, PPTX, or TXT file." },
        { status: 400 }
      );
    }
  } catch (err: unknown) {
    console.error("[analyze] error:", err);
    return NextResponse.json(
      { error: "Failed to read file content." },
      { status: 500 }
    );
  } finally {
    if (pdfTmpPath) await unlink(pdfTmpPath).catch(() => {});
    if (pptxTmpPath) await unlink(pptxTmpPath).catch(() => {});
  }

  if (segments.length === 0) {
    return NextResponse.json(
      { error: "The file appears to be empty or could not be read." },
      { status: 400 }
    );
  }

  const allText = segmentsToTexts(segments).join(" ");
  const wordCount = countWords(allText);
  const { language, docType } = await analyzeDocumentText(allText, {
    organizationId: (session.user as { organizationId?: string | null }).organizationId ?? null,
  });

  // Configurable confidence threshold (env: OCR_CONFIDENCE_THRESHOLD).
  // The wizard uses this to decide between auto-proceed vs the block card.
  const ocrThreshold = getOcrConfidenceThreshold();
  const requiresOcrRequest =
    scanned &&
    (typeof ocrConfidence !== "number" ||
      !Number.isFinite(ocrConfidence) ||
      ocrConfidence < ocrThreshold);

  return NextResponse.json({
    filename,
    wordCount,
    sourceLanguage: language,
    docType,
    segments,
    segmentCount: segments.length,
    scanned,
    ocrConfidence,
    ocrEnrichment, // canonical {provider, pages:[{pageNum,text,confidence,mistralText,blocks}], avgConfidence}
    ocrConfidenceThreshold: ocrThreshold,
    requiresOcrRequest,
    pageCount: ocrEnrichment?.pages?.length
      ? ocrEnrichment.pages.length
      : structuredData
      ? (structuredData as { pages?: unknown[] }).pages?.length ?? 0
      : 0,
    layoutHtml,
    structuredData,
    pdfStoredPath: toStorageUrl(pdfStoredPath),
    pptxStoredPath,
    docxStoredPath: toStorageUrl(docxStoredPath),
    sourceMimeType: mimeForExt(ext),
  });
}

