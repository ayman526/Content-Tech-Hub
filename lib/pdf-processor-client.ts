/**
 * pdf-processor-client.ts
 *
 * TypeScript client for the PDF Processor microservice
 * (services/pdf-processor/app.py, running on PDF_PROCESSOR_SERVICE_URL).
 *
 * All functions throw PdfServiceError on non-2xx responses so callers
 * can distinguish service-down (503) from bad-input (422) etc.
 */

const PDF_SERVICE_URL =
  process.env.PDF_PROCESSOR_SERVICE_URL ?? "http://localhost:8001";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PdfBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfBlock {
  blockId: string;
  page: number;
  blockType: "paragraph" | "heading" | "table-cell" | "caption" | "header" | "footer";
  text: string;
  direction: "ltr" | "rtl";
  bbox: PdfBbox;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontColor: string;
  alignment: "left" | "center" | "right" | "justify";
  lineHeight: number;
  columnIndex: number;
  readingOrder: number;
  // table-cell extras (only set when blockType === "table-cell")
  tableId?: string;
  tableRow?: number;
  tableCol?: number;
}

export interface PdfNonTextElement {
  type: "image" | "vector" | "watermark";
  page: number;
  bbox: PdfBbox;
}

export interface PdfExtractResult {
  pageCount: number;
  blocks: PdfBlock[];
  nonTextElements: PdfNonTextElement[];
}

export interface PdfExtractScannedResult {
  pageCount: number;
  blocks: PdfBlock[];
  nonTextElements: PdfNonTextElement[];
  needsVerification?: false;
}

export interface PdfNeedsVerification {
  needsVerification: true;
  ocrConfidence: number;
}

export interface OverlayBlock {
  blockId: string;
  translatedText: string;
  bbox: PdfBbox;
  page: number;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  alignment: "left" | "center" | "right" | "justify";
  direction: "ltr" | "rtl";
}

export class PdfServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly serviceDetail?: string,
  ) {
    super(message);
    this.name = "PdfServiceError";
  }
}

// ── Internal helpers ────────────────────────────────────────────────────────

async function postMultipart(
  endpoint: string,
  formData: FormData,
): Promise<Response> {
  const url = `${PDF_SERVICE_URL}${endpoint}`;
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", body: formData });
  } catch (err) {
    throw new PdfServiceError(
      `PDF processor service is unavailable at ${PDF_SERVICE_URL}`,
      503,
      String(err),
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new PdfServiceError(
      `PDF processor service error ${res.status} from ${endpoint}`,
      res.status,
      detail,
    );
  }
  return res;
}

async function postJson(endpoint: string, body: unknown): Promise<Response> {
  const url = `${PDF_SERVICE_URL}${endpoint}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new PdfServiceError(
      `PDF processor service is unavailable at ${PDF_SERVICE_URL}`,
      503,
      String(err),
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new PdfServiceError(
      `PDF processor service error ${res.status} from ${endpoint}`,
      res.status,
      detail,
    );
  }
  return res;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Extract text blocks with full typography and geometry metadata from a
 * native (text-layer) PDF.
 */
export async function extractPdf(buffer: Buffer): Promise<PdfExtractResult> {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "application/pdf" }), "file.pdf");
  const res = await postMultipart("/extract", form);
  return res.json() as Promise<PdfExtractResult>;
}

/**
 * Extract text from a scanned / image PDF.
 * Returns PdfExtractResult on success, or { needsVerification, ocrConfidence }
 * when OCR confidence is below threshold (caller should route to OCR queue).
 */
export async function extractScannedPdf(
  buffer: Buffer,
): Promise<PdfExtractResult | PdfNeedsVerification> {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "application/pdf" }), "file.pdf");
  const res = await postMultipart("/extract-scanned", form);
  return res.json() as Promise<PdfExtractResult | PdfNeedsVerification>;
}

/**
 * Apply translated text onto the original PDF at exact bounding-box
 * positions, preserving all non-text elements unchanged.
 * Returns the modified PDF as a Buffer.
 */
export async function applyOverlay(
  buffer: Buffer,
  translations: OverlayBlock[],
): Promise<Buffer> {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "application/pdf" }), "file.pdf");
  form.append("translations", JSON.stringify(translations));
  const res = await postMultipart("/apply-overlay", form);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/**
 * Render an HTML string to PDF via Puppeteer (running inside the microservice
 * container where Chromium is reliably installed).
 * Returns the PDF as a Buffer.
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const res = await postJson("/render-html-to-pdf", { html });
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/**
 * Ping the microservice health endpoint.
 * Returns true if the service is up and responding.
 */
export async function isPdfServiceHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${PDF_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
