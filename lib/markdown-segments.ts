/**
 * Markdown post-processing for translation segments.
 *
 * Mistral OCR returns rich markdown — # headings, ## subheadings, and
 * `| cell | cell |` tables. Our segmenter currently captures these as
 * single `formatHint: "p"` segments, so the translator returns the
 * translated cells still wrapped in pipe syntax and the renderer
 * dumps that raw string into the delivered PDF (looks broken).
 *
 * `expandMarkdownSegments` walks the segment list and:
 *   - Strips heading markers (`# `, `## `, `### `) and tags the segment
 *     with the right `formatHint` so the renderers emit real headings.
 *   - Splits markdown tables (a header row + `| --- |` separator + body
 *     rows) into per-cell segments tagged
 *       `th:t<tableId>:c<col>` for header cells
 *       `td:t<tableId>:r<row>:c<col>` for body cells
 *     The renderers can then group by `t<tableId>` and emit a real
 *     `<table>` (HTML) or DOCX `Table`.
 *   - Drops embedded image lines (`![alt](src)`) since the translated
 *     deliverable doesn't carry the source images today.
 *
 * Translations are split with the same routine, so each cell gets the
 * matching translated text. When a cell has no translation we fall back
 * to the source.
 */

export interface FlatSegment {
  sourceText: string;
  translatedText: string | null;
  formatHint?: string;
}

const SEPARATOR_RE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/;
const HEADING_RE = /^(#{1,6})\s+(.+)$/;
// Matches both inline  ![alt](url)  and reference-style  ![alt][ref]  image lines
const IMAGE_LINE_RE = /^!\[[^\]]*\](\([^)]*\)|\[[^\]]*\])\s*$/;

function isSeparatorRow(line: string): boolean {
  return SEPARATOR_RE.test(line.trim());
}

/** Returns true when the text looks like a complete markdown table block:
 *  at least one row of pipes + a separator row of dashes. */
export function looksLikeMarkdownTable(text: string): boolean {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  if (!lines[0].includes("|")) return false;
  return lines.some((l) => isSeparatorRow(l));
}

/** Parse a markdown table block into a 2-D array of cell strings.
 *  Skips the separator row. Robust to leading/trailing pipes. */
export function parseMarkdownTable(text: string): string[][] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: string[][] = [];
  for (const line of lines) {
    if (isSeparatorRow(line)) continue;
    if (!line.includes("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length && cells[0] === "") cells.shift();
    if (cells.length && cells[cells.length - 1] === "") cells.pop();
    if (cells.length === 0) continue;
    rows.push(cells);
  }
  return rows;
}

function stripHeadingMarker(text: string): { level: 1 | 2 | 3; clean: string } | null {
  const m = text.match(HEADING_RE);
  if (!m) return null;
  const level = Math.min(m[1].length, 3) as 1 | 2 | 3;
  return { level, clean: m[2].trim() };
}

function isImageOnly(text: string): boolean {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 && lines.every((l) => IMAGE_LINE_RE.test(l));
}

/** Main transformer — see file header. */
export function expandMarkdownSegments(segments: FlatSegment[]): FlatSegment[] {
  const out: FlatSegment[] = [];
  let nextTableId = 0;

  for (const seg of segments) {
    const src = (seg.sourceText ?? "").trim();
    const trg = (seg.translatedText ?? "").trim();

    if (!src) continue;

    // Drop embedded image lines — we don't carry source images into the
    // translated deliverable today.
    if (isImageOnly(src)) continue;

    // Markdown table — expand into per-cell segments
    if (looksLikeMarkdownTable(src)) {
      const srcRows = parseMarkdownTable(src);
      const trgRows = trg && looksLikeMarkdownTable(trg) ? parseMarkdownTable(trg) : [];
      if (srcRows.length >= 1) {
        const tId = nextTableId++;
        const headerCells = srcRows[0];
        const headerTrg = trgRows[0] ?? [];
        for (let c = 0; c < headerCells.length; c++) {
          out.push({
            sourceText: headerCells[c],
            translatedText: headerTrg[c] ?? null,
            formatHint: `th:t${tId}:c${c}`,
          });
        }
        for (let r = 1; r < srcRows.length; r++) {
          const srcRow = srcRows[r];
          const trgRow = trgRows[r] ?? [];
          for (let c = 0; c < srcRow.length; c++) {
            out.push({
              sourceText: srcRow[c],
              translatedText: trgRow[c] ?? null,
              formatHint: `td:t${tId}:r${r - 1}:c${c}`,
            });
          }
        }
        continue;
      }
    }

    // Single-line heading (# / ## / ###)
    if (!src.includes("\n")) {
      const h = stripHeadingMarker(src);
      if (h) {
        const tHead = trg ? stripHeadingMarker(trg) : null;
        out.push({
          sourceText: h.clean,
          translatedText: tHead ? tHead.clean : trg || null,
          formatHint: `h${h.level}`,
        });
        continue;
      }
    }

    // Multi-line block that starts with a heading? Split off the heading
    // line and recurse with the remainder.
    if (src.includes("\n")) {
      const lines = src.split(/\r?\n/);
      const firstNonEmpty = lines.find((l) => l.trim().length > 0) ?? "";
      const h = stripHeadingMarker(firstNonEmpty.trim());
      if (h) {
        const remainder = lines
          .slice(lines.indexOf(firstNonEmpty) + 1)
          .join("\n")
          .trim();
        const trgLines = trg.split(/\r?\n/);
        const trgFirst = trgLines.find((l) => l.trim().length > 0) ?? "";
        const trgHead = stripHeadingMarker(trgFirst.trim());
        const trgRemainder = trgLines
          .slice(trgLines.indexOf(trgFirst) + 1)
          .join("\n")
          .trim();
        out.push({
          sourceText: h.clean,
          translatedText: trgHead ? trgHead.clean : trgFirst.trim() || null,
          formatHint: `h${h.level}`,
        });
        if (remainder) {
          // Recurse on remainder so nested tables/headings get expanded too.
          for (const child of expandMarkdownSegments([
            { sourceText: remainder, translatedText: trgRemainder || null, formatHint: seg.formatHint },
          ])) {
            out.push(child);
          }
        }
        continue;
      }
    }

    out.push(seg);
  }

  return out;
}

/** Helper used by renderers — given a formatHint string, returns the
 *  table id when the hint encodes a table cell (`th:tN:...` or
 *  `td:tN:...`), or null otherwise. */
export function tableIdFromHint(hint: string | undefined): number | null {
  if (!hint) return null;
  const m = hint.match(/^t[hd]:t(\d+):/);
  return m ? Number(m[1]) : null;
}

/** Returns a parsed cell descriptor for a th/td hint, or null. */
export function parseCellHint(
  hint: string | undefined
): { kind: "th" | "td"; tableId: number; row: number; col: number } | null {
  if (!hint) return null;
  let m = hint.match(/^th:t(\d+):c(\d+)$/);
  if (m) return { kind: "th", tableId: Number(m[1]), row: 0, col: Number(m[2]) };
  m = hint.match(/^td:t(\d+):r(\d+):c(\d+)$/);
  if (m) return { kind: "td", tableId: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
  return null;
}
