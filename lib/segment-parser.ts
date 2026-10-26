/**
 * Format-preserving document segmenter.
 *
 * Returns an ordered list of { text, formatHint } objects where formatHint is
 * one of: "h1" | "h2" | "h3" | "li" | "th" | "td" | "p" (default).
 *
 * For DOCX files pass the file buffer; for PDF/TXT pass plain extracted text.
 */

export interface Segment {
  text: string;
  formatHint: "h1" | "h2" | "h3" | "li" | "th" | "td" | "p" | string;
  // Optional rich metadata populated by the pdf-processor microservice
  blockId?: string;
  blockType?: string;
  blockPage?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontColor?: string;
  textAlignment?: string;
  lineHeight?: number;
  bboxJson?: { x: number; y: number; width: number; height: number };
  direction?: string;
  columnIndex?: number;
  readingOrder?: number;
  tableId?: string;
  tableRow?: number;
  tableCol?: number;
}

const MIN_LEN = 10;
const MAX_SEGMENTS = 200;

/* ── HTML → Segments (used for DOCX via mammoth.convertToHtml) ─────────── */

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
}

function htmlToSegments(html: string): Segment[] {
  const segs: Segment[] = [];

  // Split on block-level tags
  const blockRe = /<(h[1-6]|p|li|th|td|blockquote|pre|div)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = stripTags(match[2]);
    if (inner.length < MIN_LEN) continue;

    let hint: Segment["formatHint"] = "p";
    if (tag === "h1") hint = "h1";
    else if (tag === "h2") hint = "h2";
    else if (tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") hint = "h3";
    else if (tag === "li") hint = "li";
    else if (tag === "th") hint = "th";
    else if (tag === "td") hint = "td";

    // Long paragraphs split into sentences
    if (hint === "p" && inner.length > 400) {
      const sentences = splitSentences(inner);
      for (const s of sentences) {
        if (s.length >= MIN_LEN) segs.push({ text: s, formatHint: "p" });
      }
    } else {
      segs.push({ text: inner, formatHint: hint });
    }

    if (segs.length >= MAX_SEGMENTS) break;
  }

  return segs;
}

/* ── Plain text → Segments (PDF / TXT) ─────────────────────────────────── */

function isHeading(line: string): "h1" | "h2" | null {
  const t = line.trim();
  if (!t || t.length > 120) return null;
  // All-caps (allows spaces, digits, punctuation like colon/hyphen)
  if (/^[A-Z0-9\s\-–—:.,/()&]+$/.test(t) && /[A-Z]{2,}/.test(t) && t.length < 80) return "h1";
  // Title-case short line with no trailing period
  if (t.length < 80 && !t.endsWith(".") && !t.endsWith(",") && /^[A-Z\u00C0-\u024F]/.test(t)) {
    const words = t.split(/\s+/);
    const titleCased = words.filter((w) => /^[A-Z\u00C0-\u024F]/.test(w)).length;
    if (titleCased / words.length >= 0.6 && words.length <= 10) return "h2";
  }
  return null;
}

function isListItem(line: string): boolean {
  return /^(\s*[-•*▪◦‣]\s+|\s*\d+[.)]\s+|\s*[a-z]\.\s+)/.test(line);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?؟])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_LEN);
}

// ── Markdown-aware helpers ──────────────────────────────────────────────
// Mistral OCR returns rich markdown — `# Heading` lines and `| col | col |`
// tables. The historical line-buffer logic below joined consecutive lines
// with a single space, which destroyed the line breaks that the
// table/heading expander at delivery time needs. These helpers let us
// detect and preserve those structures as their own segments.
const MD_TABLE_SEPARATOR_RE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/;
const MD_HEADING_RE = /^(#{1,6})\s+(.+)$/;

function isMdHeading(line: string): { level: "h1" | "h2" | "h3"; clean: string } | null {
  const m = line.match(MD_HEADING_RE);
  if (!m) return null;
  const lvl = Math.min(m[1].length, 3);
  const tag = (lvl === 1 ? "h1" : lvl === 2 ? "h2" : "h3") as "h1" | "h2" | "h3";
  return { level: tag, clean: m[2].trim() };
}

function isPipeRow(line: string): boolean {
  return line.includes("|");
}

function isMdTableSeparator(line: string): boolean {
  return MD_TABLE_SEPARATOR_RE.test(line);
}

function plainTextToSegments(text: string): Segment[] {
  const segs: Segment[] = [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  let paragraphBuffer: string[] = [];

  function flushParagraph() {
    const joined = paragraphBuffer.join(" ").trim();
    paragraphBuffer = [];
    if (joined.length < MIN_LEN) return;
    const sentences = splitSentences(joined);
    for (const s of sentences) {
      if (s.length >= MIN_LEN && segs.length < MAX_SEGMENTS) {
        segs.push({ text: s, formatHint: "p" });
      }
    }
  }

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      flushParagraph();
      i++;
      continue;
    }

    // Markdown heading (# / ## / ### …) — emit as a single segment with the
    // marker stripped. Keeps the editor view clean and lets the renderers
    // emit a real <h*>.
    const mdHead = isMdHeading(line);
    if (mdHead) {
      flushParagraph();
      if (segs.length < MAX_SEGMENTS) {
        segs.push({ text: mdHead.clean, formatHint: mdHead.level });
      }
      i++;
      continue;
    }

    // Markdown table — a header row followed by a `| --- | --- |` separator
    // (and any number of body rows). Emit the entire block as one "p"
    // segment with newlines preserved so the delivery-time expander can
    // re-detect it and produce a real <table>.
    if (
      isPipeRow(line) &&
      i + 1 < lines.length &&
      isMdTableSeparator(lines[i + 1].trim())
    ) {
      flushParagraph();
      const tableLines: string[] = [line];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j].trim();
        if (!next) break;
        if (!isPipeRow(next)) break;
        tableLines.push(next);
        j++;
      }
      if (segs.length < MAX_SEGMENTS) {
        segs.push({ text: tableLines.join("\n"), formatHint: "p" });
      }
      i = j;
      continue;
    }

    if (isListItem(line)) {
      flushParagraph();
      const cleaned = line.replace(/^[\s\-•*▪◦‣\d.)a-z]+\s*/i, "").trim();
      if (cleaned.length >= MIN_LEN && segs.length < MAX_SEGMENTS) {
        segs.push({ text: cleaned, formatHint: "li" });
      }
      i++;
      continue;
    }

    const hintLevel = isHeading(line);
    if (hintLevel) {
      flushParagraph();
      if (segs.length < MAX_SEGMENTS) segs.push({ text: line, formatHint: hintLevel });
      i++;
      continue;
    }

    paragraphBuffer.push(line);
    i++;
  }

  flushParagraph();
  return segs;
}

/* ── Direct DOCX XML walker ─────────────────────────────────────────────── */

/**
 * Depth-aware element range finder for DOCX XML.
 * Correctly handles nested elements (e.g. tables inside tables).
 * Returns [startOffset, endOffset] pairs for every instance of tagName.
 */
function findXmlRanges(xml: string, tagName: string): Array<[number, number]> {
  const open = `<${tagName}`;
  const close = `</${tagName}>`;
  const ranges: Array<[number, number]> = [];
  let depth = 0;
  let start = -1;
  let i = 0;
  while (i < xml.length) {
    if (
      xml.startsWith(open, i) &&
      (xml[i + open.length] === ">" || xml[i + open.length] === " ")
    ) {
      if (depth === 0) start = i;
      depth++;
      i += open.length;
    } else if (xml.startsWith(close, i)) {
      depth--;
      if (depth === 0 && start >= 0) {
        ranges.push([start, i + close.length]);
        start = -1;
      }
      i += close.length;
    } else {
      i++;
    }
  }
  return ranges;
}

/**
 * Extract the joined text content from a single <w:p> XML string.
 * Uses the same logic as the in-place delivery translator so the source text
 * stored in the DB is byte-for-byte identical to what the translator sees —
 * guaranteeing 1:1 lookup matches at delivery time.
 */
function paraText(paraXml: string): string {
  const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  const parts: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(paraXml)) !== null) parts.push(m[1]);
  return parts.join("").replace(/\s+/g, " ").trim();
}

/**
 * Detect format hint from a paragraph's style and properties.
 * Reads <w:pStyle>, <w:numPr>, etc. directly from the XML.
 */
function paraFormatHint(paraXml: string): Segment["formatHint"] {
  const styleM = paraXml.match(/<w:pStyle\s+w:val="([^"]+)"/);
  if (styleM) {
    const s = styleM[1].toLowerCase().replace(/[\s_-]/g, "");
    if (s === "title" || s.startsWith("heading1")) return "h1";
    if (s.startsWith("heading2")) return "h2";
    if (s.startsWith("heading3") || s.startsWith("heading4") || s.startsWith("heading5")) return "h3";
    if (s.startsWith("listparagraph") || s.startsWith("listbullet") || s.startsWith("listnumber")) return "li";
  }
  if (/<w:numPr>/.test(paraXml)) return "li";
  return "p";
}

/**
 * Walk word/document.xml and emit ordered Segment[] that mirrors the exact
 * document structure — paragraphs, headings, lists, and table cells with
 * row/column positions — without going through an HTML intermediate.
 */
function extractSegmentsFromDocxXml(xml: string): Segment[] {
  const PARA_MIN = 1; // minimum text length to keep a segment
  const TABLE_CELL_MIN = 1;
  const segs: Segment[] = [];

  // Locate the document body
  const bodyOpen = xml.indexOf("<w:body");
  const bodyClose = xml.lastIndexOf("</w:body>");
  if (bodyOpen < 0 || bodyClose < 0) return segs;
  const body = xml.slice(bodyOpen, bodyClose + "</w:body>".length);

  // Find all top-level table ranges (depth-aware → handles nested tables)
  const tableRanges = findXmlRanges(body, "w:tbl");

  // Find all paragraph ranges in the full body (including those inside tables)
  const allParaRanges = findXmlRanges(body, "w:p");

  type DocElem =
    | { kind: "table"; id: number; start: number; end: number }
    | { kind: "para"; start: number; end: number };

  // Build an interleaved list of top-level tables + non-table paragraphs
  const elems: DocElem[] = [];

  tableRanges.forEach(([s, e], idx) => {
    elems.push({ kind: "table", id: idx, start: s, end: e });
  });

  for (const [pStart, pEnd] of allParaRanges) {
    // Skip paragraphs that live inside a table — they're handled per-cell below
    const insideTable = tableRanges.some(([ts, te]) => pStart >= ts && pEnd <= te);
    if (!insideTable) {
      elems.push({ kind: "para", start: pStart, end: pEnd });
    }
  }

  // Sort by position to restore document order
  elems.sort((a, b) => a.start - b.start);

  for (const el of elems) {
    if (el.kind === "para") {
      const text = paraText(body.slice(el.start, el.end));
      if (text.length >= PARA_MIN) {
        segs.push({ text, formatHint: paraFormatHint(body.slice(el.start, el.end)) });
      }
    } else {
      // Table: walk rows → cells → paragraphs in order
      const tableXml = body.slice(el.start, el.end);
      const rowRanges = findXmlRanges(tableXml, "w:tr");

      rowRanges.forEach(([rStart, rEnd], rowIdx) => {
        const rowXml = tableXml.slice(rStart, rEnd);
        const cellRanges = findXmlRanges(rowXml, "w:tc");

        cellRanges.forEach(([cStart, cEnd], colIdx) => {
          const cellXml = rowXml.slice(cStart, cEnd);
          const paraRanges = findXmlRanges(cellXml, "w:p");

          for (const [pStart, pEnd] of paraRanges) {
            const text = paraText(cellXml.slice(pStart, pEnd));
            if (text.length >= TABLE_CELL_MIN) {
              segs.push({
                text,
                formatHint: `cell:t${el.id}r${rowIdx}c${colIdx}`,
                tableId: String(el.id),
                tableRow: rowIdx,
                tableCol: colIdx,
              });
            }
          }
        });
      });
    }
  }

  return segs;
}

/* ── Public API ─────────────────────────────────────────────────────────── */

/**
 * Parse a DOCX buffer into format-preserving segments using direct XML
 * walking — no HTML intermediate.
 *
 * The extracted text is produced by the same <w:t>-joining logic used by
 * translateDocxInPlace() at delivery time, so srcToTranslation lookups
 * always find a match. Falls back to mammoth if XML extraction yields
 * fewer than 3 segments (malformed DOCX, encrypted file, etc.).
 */
export async function parseDocx(buffer: Buffer): Promise<Segment[]> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const docEntry = zip.file("word/document.xml");
    if (docEntry) {
      const xml = await docEntry.async("string");
      const segs = extractSegmentsFromDocxXml(xml);
      if (segs.length >= 3) return segs;
      console.warn("[parseDocx] XML walker produced only", segs.length, "segments — falling back to mammoth");
    }
  } catch (err) {
    console.warn("[parseDocx] XML walk failed, falling back to mammoth:", (err as Error)?.message);
  }

  // Fallback: mammoth HTML conversion
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.convertToHtml({ buffer });
  const segs = htmlToSegments(result.value);
  if (segs.length >= 3) return segs;
  const plain = await mammoth.extractRawText({ buffer });
  return plainTextToSegments(plain.value);
}

/**
 * Parse already-extracted plain text (PDF or TXT) into format-preserving segments.
 */
export function parsePlainText(text: string): Segment[] {
  return plainTextToSegments(text);
}

/** Helper: extract just the text strings (for word-count, AI analysis, etc.) */
export function segmentsToTexts(segs: Segment[]): string[] {
  return segs.map((s) => s.text);
}

/**
 * Extract segments directly from pdftohtml positioned-HTML output.
 *
 * Each <p> element in pdftohtml HTML corresponds to exactly one text block
 * in the PDF. Using these as segments guarantees 1-to-1 mapping at delivery
 * time — no column-merge artifacts that pdftotext introduces.
 *
 * Skips purely numeric strings (page numbers, single digits) and texts shorter
 * than 2 characters.
 */
export function extractSegmentsFromPdfHtml(layoutHtml: string): Segment[] {
  const segs: Segment[] = [];

  // Strip base64 image data before processing — speeds up the regex
  const stripped = layoutHtml.replace(/src="data:image[^"]*"/gi, 'src="IMG"');

  const paraRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((match = paraRe.exec(stripped)) !== null) {
    const inner = match[1];
    // Strip HTML tags, decode basic entities, collapse whitespace
    const text = inner
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#160;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text || text.length < 2) continue;
    // Skip pure numbers (page refs, seat numbers already embedded in bigger segs)
    if (/^\d+$/.test(text)) continue;
    // Deduplicate (pdftohtml sometimes emits the same text twice)
    if (seen.has(text)) continue;
    seen.add(text);

    segs.push({ text, formatHint: "p" });

    if (segs.length >= MAX_SEGMENTS) break;
  }

  return segs;
}
