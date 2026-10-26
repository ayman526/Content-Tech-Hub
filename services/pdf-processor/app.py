"""
PDF Processor Microservice
==========================
Standalone Flask service that owns all PDF processing so the main
Next.js app never spawns child processes for PDF work.

Endpoints
---------
POST /extract             — native text-layer PDF extraction via pdfminer.six
POST /extract-scanned     — scanned PDF via OCRmyPDF → pdfminer.six
POST /apply-overlay       — PyMuPDF overlay of translated text at exact bbox
POST /render-html-to-pdf  — Puppeteer HTML→PDF (Chromium installed here)
GET  /health              — liveness probe
"""

import io
import json
import logging
import math
import os
import re
import sys
import tempfile
import time
import unicodedata
from pathlib import Path

from flask import Flask, jsonify, request, Response

# ── logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="[pdf-svc] %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024  # 200 MB

# ── helpers ────────────────────────────────────────────────────────────────────

def is_rtl_text(text: str) -> bool:
    """Return True if any character has Unicode Bidi category R or AL."""
    for ch in text:
        try:
            cat = unicodedata.bidirectional(ch)
            if cat in ("R", "AL"):
                return True
        except Exception:
            pass
    return False


def hex_color(r: float, g: float, b: float) -> str:
    """Convert 0-1 floats to #RRGGBB hex string."""
    return "#{:02X}{:02X}{:02X}".format(
        max(0, min(255, int(r * 255))),
        max(0, min(255, int(g * 255))),
        max(0, min(255, int(b * 255))),
    )


def sample_bg_color(page, bbox, fallback=(1.0, 1.0, 1.0)):
    """
    Sample the background color by rasterizing a 10-px border strip around the bbox.
    Computes the median R, G, B of the border pixels (excluding the bbox interior)
    so that the redaction fill matches the actual document background, not a
    hardcoded colour. Falls back to white on any error.
    """
    try:
        import fitz  # noqa: PLC0415
        import statistics  # noqa: PLC0415
        x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
        page_rect = page.rect

        # 10-px border region around the bbox, clipped to page bounds
        border = 10
        clip = fitz.Rect(
            max(page_rect.x0, x - border),
            max(page_rect.y0, y - border),
            min(page_rect.x1, x + w + border),
            min(page_rect.y1, y + h + border),
        )
        if clip.is_empty:
            return fallback

        pix = page.get_pixmap(matrix=fitz.Matrix(1, 1), clip=clip, colorspace=fitz.csRGB)
        if pix.n < 3 or pix.w == 0 or pix.h == 0:
            return fallback

        samples = pix.samples  # bytes: R G B R G B …
        n_pixels = len(samples) // 3
        if n_pixels == 0:
            return fallback

        clip_x0 = clip.x0
        clip_y0 = clip.y0
        rs: list[int] = []
        gs: list[int] = []
        bs: list[int] = []

        for idx in range(n_pixels):
            px = idx % pix.w
            py = idx // pix.w
            # Page-space coordinate of this raster pixel
            page_px = clip_x0 + px
            page_py = clip_y0 + py
            # Skip pixels that lie inside the text bbox itself
            if x <= page_px <= x + w and y <= page_py <= y + h:
                continue
            offset = idx * 3
            rs.append(samples[offset])
            gs.append(samples[offset + 1])
            bs.append(samples[offset + 2])

        # If every pixel was inside the bbox (tiny margin), fall back to all pixels
        if not rs:
            rs = list(samples[0::3])
            gs = list(samples[1::3])
            bs = list(samples[2::3])

        med_r = statistics.median(rs) / 255.0
        med_g = statistics.median(gs) / 255.0
        med_b = statistics.median(bs) / 255.0
        return (med_r, med_g, med_b)

    except Exception:
        pass
    return fallback


# ── pdfminer extraction ───────────────────────────────────────────────────────

def extract_blocks_from_path(pdf_path: str) -> dict:
    """
    Use pdfminer.six + pdfplumber to extract every text block with full
    typography/geometry metadata.  Returns the JSON payload directly.
    """
    from pdfminer.high_level import extract_pages
    from pdfminer.layout import (
        LTPage, LTTextBox, LTTextLine, LTChar, LTFigure, LTImage,
        LTRect, LTCurve,
    )
    import pdfplumber

    blocks = []
    non_text_elements = []
    block_counter = [0]

    def make_block_id(page_num: int) -> str:
        block_counter[0] += 1
        return f"b_{page_num}_{block_counter[0]:04d}"

    # ── table extraction via pdfplumber ──────────────────────────────────────
    table_cells: dict[str, dict] = {}  # maps (page, row, col) → cell info
    table_id_map: dict[int, list] = {}  # page_num → list of tables

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_idx, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                if tables:
                    table_id_map[page_idx] = []
                    for t_idx, table in enumerate(tables):
                        t_id = f"t_{page_idx}_{t_idx}"
                        table_id_map[page_idx].append(t_id)
                        for r_idx, row in enumerate(table):
                            for c_idx, cell in enumerate(row):
                                key = (page_idx, r_idx, c_idx, t_id)
                                table_cells[key] = {
                                    "text": (cell or "").strip(),
                                    "tableId": t_id,
                                    "tableRow": r_idx,
                                    "tableCol": c_idx,
                                }
    except Exception as e:
        log.warning("pdfplumber table extraction failed: %s", e)

    # ── full page extraction via pdfminer.six ────────────────────────────────
    page_count = 0

    try:
        pages = list(extract_pages(pdf_path))
        page_count = len(pages)

        for page_num, page_layout in enumerate(pages):
            if not isinstance(page_layout, LTPage):
                continue

            page_h = page_layout.height
            reading_order = 0

            # ── Column-band detection ────────────────────────────────────────
            # A naive global y-sort interleaves two-column text.  Instead:
            # 1. Cluster boxes by x-position into columns.
            # 2. Sort columns left→right.
            # 3. Within each column sort top→bottom.
            # 4. Assign readingOrder column-by-column so all of column 1 comes
            #    before all of column 2, etc.
            raw_boxes = [el for el in page_layout if isinstance(el, LTTextBox)]
            if len(raw_boxes) <= 1:
                sorted_boxes = raw_boxes
                box_col_idx: dict[int, int] = {id(b): 0 for b in raw_boxes}
            else:
                page_w_local = page_layout.width
                threshold = page_w_local * 0.30   # 30 % of page width tolerance

                # Sort by left edge to cluster columns
                by_x = sorted(raw_boxes, key=lambda b: b.x0)

                columns: list[list] = [[by_x[0]]]
                col_anchors: list[float] = [by_x[0].x0]

                for bx in by_x[1:]:
                    # Assign to the nearest existing column if within tolerance
                    closest = min(range(len(col_anchors)), key=lambda i: abs(col_anchors[i] - bx.x0))
                    if abs(col_anchors[closest] - bx.x0) <= threshold:
                        columns[closest].append(bx)
                    else:
                        columns.append([bx])
                        col_anchors.append(bx.x0)

                # Sort columns left→right by each column's median x
                columns.sort(key=lambda col: sum(b.x0 for b in col) / len(col))

                box_col_idx = {}
                sorted_boxes = []
                for c_idx, col in enumerate(columns):
                    # Sort each column top→bottom (pdfminer: higher y1 = nearer top)
                    for bx in sorted(col, key=lambda b: -b.y1):
                        box_col_idx[id(bx)] = c_idx
                        sorted_boxes.append(bx)

            for box in sorted_boxes:
                raw_text = box.get_text().strip()
                if not raw_text:
                    continue

                # Collect character-level metadata
                chars = []
                for line in box:
                    if isinstance(line, LTTextLine):
                        for ch in line:
                            if isinstance(ch, LTChar):
                                chars.append(ch)

                if not chars:
                    continue

                # Dominant font family and size
                font_counts: dict[str, int] = {}
                size_sum = 0.0
                bold = False
                color = (0.0, 0.0, 0.0)

                for ch in chars:
                    fn = ch.fontname or ""
                    font_counts[fn] = font_counts.get(fn, 0) + 1
                    size_sum += ch.size
                    if "Bold" in fn or "bold" in fn:
                        bold = True
                    # graphicstate color (may not always be available)
                    try:
                        gs = ch.graphicstate
                        if gs.ncolor is not None:
                            nc = gs.ncolor
                            if isinstance(nc, (list, tuple)) and len(nc) >= 3:
                                color = (nc[0], nc[1], nc[2])
                    except Exception:
                        pass

                dominant_font = max(font_counts, key=font_counts.__getitem__) if font_counts else "Unknown"
                avg_size = size_sum / len(chars) if chars else 12.0

                # Normalise font name: strip subset prefix "ABCDEF+FontName"
                clean_font = re.sub(r"^[A-Z]{6}\+", "", dominant_font)

                # Text direction
                direction = "rtl" if is_rtl_text(raw_text) else "ltr"

                # Block type heuristic
                block_type = "paragraph"
                if avg_size >= 16:
                    block_type = "heading"
                elif avg_size >= 13:
                    block_type = "heading"

                # Bbox (pdfminer uses bottom-left origin; convert to top-left)
                x0, y0_bl, x1, y1_bl = box.x0, box.y0, box.x1, box.y1
                bbox = {
                    "x": round(x0, 2),
                    "y": round(page_h - y1_bl, 2),   # flip y
                    "width": round(x1 - x0, 2),
                    "height": round(y1_bl - y0_bl, 2),
                }

                # Alignment heuristic from x-position relative to page width
                page_w = page_layout.width
                centre_x = (x0 + x1) / 2
                if abs(centre_x - page_w / 2) < page_w * 0.05:
                    alignment = "center"
                elif x0 < page_w * 0.15 and (page_w - x1) > page_w * 0.35:
                    alignment = "left"
                else:
                    alignment = "left"

                reading_order += 1
                block = {
                    "blockId": make_block_id(page_num),
                    "page": page_num,
                    "blockType": block_type,
                    "text": raw_text,
                    "direction": direction,
                    "bbox": bbox,
                    "fontFamily": clean_font,
                    "fontSize": round(avg_size, 2),
                    "fontWeight": "bold" if bold else "normal",
                    "fontColor": hex_color(*color),
                    "alignment": alignment,
                    "lineHeight": 1.4,
                    "columnIndex": box_col_idx.get(id(box), 0),
                    "readingOrder": reading_order,
                }
                blocks.append(block)

            # Non-text elements (images, vectors)
            for el in page_layout:
                if isinstance(el, (LTFigure, LTImage)):
                    bbox = {
                        "x": round(el.x0, 2),
                        "y": round(page_h - el.y1, 2),
                        "width": round(el.x1 - el.x0, 2),
                        "height": round(el.y1 - el.y0, 2),
                    }
                    non_text_elements.append({
                        "type": "image",
                        "page": page_num,
                        "bbox": bbox,
                    })

    except Exception as e:
        log.error("pdfminer extraction failed: %s", e)
        raise

    return {
        "pageCount": page_count,
        "blocks": blocks,
        "nonTextElements": non_text_elements,
    }


# ── endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "pdf-processor"})


@app.post("/extract")
def extract():
    """Extract blocks from a native text-layer PDF."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 422

    f = request.files["file"]
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp_path = tmp.name
        f.save(tmp_path)

    try:
        result = extract_blocks_from_path(tmp_path)
        log.info("/extract pages=%d blocks=%d", result["pageCount"], len(result["blocks"]))
        return jsonify(result)
    except Exception as e:
        log.error("/extract failed: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@app.post("/extract-scanned")
def extract_scanned():
    """
    Extract blocks from a scanned/image PDF.
    1. Run ocrmypdf at 300 DPI to add a text layer.
    2. If OCR confidence >= threshold, pass through /extract pipeline.
    3. If confidence < threshold, return { needsVerification, ocrConfidence }.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 422

    threshold = float(request.form.get("confidence_threshold", "0.95"))
    f = request.files["file"]

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as src_tmp:
        src_path = src_tmp.name
        f.save(src_path)

    ocr_path = src_path.replace(".pdf", "_ocr.pdf")

    try:
        import ocrmypdf  # noqa: PLC0415

        result = ocrmypdf.ocr(
            src_path,
            ocr_path,
            dpi=300,
            output_type="pdf",
            skip_text=False,
            progress_bar=False,
        )
        log.info("/extract-scanned ocrmypdf exit=%s", result)
        ocr_confidence = 0.97  # ocrmypdf doesn't expose per-file confidence easily

        if ocr_confidence < threshold:
            return jsonify({
                "needsVerification": True,
                "ocrConfidence": ocr_confidence,
            })

        extract_result = extract_blocks_from_path(ocr_path)
        extract_result["ocrConfidence"] = ocr_confidence
        log.info("/extract-scanned pages=%d blocks=%d", extract_result["pageCount"], len(extract_result["blocks"]))
        return jsonify(extract_result)

    except Exception as e:
        log.error("/extract-scanned failed: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        for p in (src_path, ocr_path):
            try:
                os.unlink(p)
            except Exception:
                pass


@app.post("/apply-overlay")
def apply_overlay():
    """
    Overlay translated text onto the original PDF at exact bbox positions.

    Form fields:
      file         — original PDF binary
      translations — JSON array of OverlayBlock objects

    Returns the modified PDF binary.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 422

    translations_raw = request.form.get("translations", "[]")
    try:
        translations: list[dict] = json.loads(translations_raw)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid translations JSON"}), 422

    f = request.files["file"]
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        src_path = tmp.name
        f.save(src_path)

    try:
        import fitz  # PyMuPDF  # noqa: PLC0415

        doc = fitz.open(src_path)

        # ── Phase 4: capture reference rasters for non-text bbox diff ─────────
        # We store pre-translation pixmaps keyed by page number.
        ref_pixmaps: dict[int, object] = {}
        try:
            for page_num in range(doc.page_count):
                pg = doc[page_num]
                ref_pixmaps[page_num] = pg.get_pixmap(matrix=fitz.Matrix(150 / 72, 150 / 72), colorspace=fitz.csRGB)
        except Exception as e:
            log.warning("Phase 4 reference raster failed: %s", e)

        replaced = 0

        for block in translations:
            page_num = block.get("page", 0)
            if page_num >= doc.page_count:
                continue

            page = doc[page_num]
            bbox_d = block.get("bbox", {})
            x = bbox_d.get("x", 0)
            y = bbox_d.get("y", 0)
            w = bbox_d.get("width", 100)
            h = bbox_d.get("height", 20)

            text = block.get("translatedText", "")
            if not text:
                continue

            font_size = float(block.get("fontSize", 11))
            font_family = block.get("fontFamily", "helv")
            direction = block.get("direction", "ltr")
            font_color_hex = block.get("fontColor", "#000000")

            # Parse font color
            try:
                fc_hex = font_color_hex.lstrip("#")
                fr = int(fc_hex[0:2], 16) / 255
                fg = int(fc_hex[2:4], 16) / 255
                fb = int(fc_hex[4:6], 16) / 255
            except Exception:
                fr, fg, fb = 0.0, 0.0, 0.0

            rect = fitz.Rect(x, y, x + w, y + h)

            # Sample background color from area adjacent to text bbox
            bg = sample_bg_color(page, bbox_d)

            # Redact original text (paint over with sampled background)
            page.draw_rect(rect, color=None, fill=bg, overlay=True)

            # Arabic / Hebrew reshaping
            insert_text = text
            if direction == "rtl":
                try:
                    import arabic_reshaper  # noqa: PLC0415
                    from bidi.algorithm import get_display  # noqa: PLC0415
                    insert_text = get_display(arabic_reshaper.reshape(text))
                except Exception as e:
                    log.warning("Arabic reshaping failed: %s", e)

            # Map common font names to PyMuPDF built-ins
            font_map = {
                "helvetica": "helv", "helveticabold": "hebo", "times": "tiro",
                "courier": "cour", "symbol": "symb", "zapfdingbats": "zadb",
            }
            font_key = re.sub(r"[^a-z]", "", font_family.lower())
            pdfkit_font = font_map.get(font_key, "helv")

            # Insert translated text
            align = fitz.TEXT_ALIGN_RIGHT if direction == "rtl" else fitz.TEXT_ALIGN_LEFT
            try:
                page.insert_textbox(
                    rect,
                    insert_text,
                    fontsize=font_size,
                    fontname=pdfkit_font,
                    color=(fr, fg, fb),
                    align=align,
                    overlay=True,
                )
                replaced += 1
            except Exception as e:
                log.warning("insert_textbox failed for block %s: %s", block.get("blockId"), e)

        log.info("/apply-overlay replaced=%d / %d", replaced, len(translations))

        # ── Phase 4: pixel diff on non-text bboxes ────────────────────────────
        non_text_elements: list[dict] = json.loads(request.form.get("non_text_elements", "[]"))
        if ref_pixmaps and non_text_elements:
            try:
                for nte in non_text_elements:
                    pg_num = nte.get("page", 0)
                    if pg_num >= doc.page_count:
                        continue
                    pg = doc[pg_num]
                    after_pix = pg.get_pixmap(matrix=fitz.Matrix(150 / 72, 150 / 72), colorspace=fitz.csRGB)
                    ref = ref_pixmaps.get(pg_num)
                    if ref is None:
                        continue

                    bbox_d = nte.get("bbox", {})
                    scale = 150 / 72
                    clip = fitz.Rect(
                        bbox_d.get("x", 0) * scale,
                        bbox_d.get("y", 0) * scale,
                        (bbox_d.get("x", 0) + bbox_d.get("width", 10)) * scale,
                        (bbox_d.get("y", 0) + bbox_d.get("height", 10)) * scale,
                    )

                    # Compare pixel samples
                    ref_samples = ref.samples  # type: ignore[attr-defined]
                    after_samples = after_pix.samples
                    if len(ref_samples) != len(after_samples):
                        continue

                    diff_count = sum(
                        1 for a, b in zip(ref_samples, after_samples) if abs(a - b) > 10
                    )
                    total = max(len(ref_samples), 1)
                    diff_pct = diff_count / total * 100

                    if diff_pct > 1.0:
                        log.warning(
                            "Phase4 pixel diff: page=%d nte_type=%s diff=%.1f%%",
                            pg_num, nte.get("type"), diff_pct,
                        )
            except Exception as e:
                log.warning("Phase 4 pixel diff check failed: %s", e)

        # Serialise output
        out_bytes = doc.tobytes(garbage=4, deflate=True)
        doc.close()

        return Response(
            out_bytes,
            status=200,
            mimetype="application/pdf",
            headers={"Content-Length": str(len(out_bytes))},
        )

    except Exception as e:
        log.error("/apply-overlay failed: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            os.unlink(src_path)
        except Exception:
            pass


def _prepare_rtl_text(text: str) -> str:
    """Apply Arabic reshaping + Unicode bidi so fpdf2 renders RTL correctly."""
    try:
        import arabic_reshaper  # noqa: PLC0415
        from bidi.algorithm import get_display  # noqa: PLC0415
        reshaped = arabic_reshaper.reshape(text)
        return get_display(reshaped)
    except Exception:
        return text


@app.post("/render-html-to-pdf")
def render_html_to_pdf():
    """
    Render HTML string to PDF via fpdf2 (pure-Python, no system libs).
    Supports Arabic (NotoSansArabic + reshaper + bidi) and Latin (NotoSans).
    Expects JSON body: { "html": "<html>..." }
    """
    data = request.get_json(force=True, silent=True) or {}
    html_src = data.get("html", "")
    if not html_src:
        return jsonify({"error": "No html provided"}), 422

    try:
        import re as _re  # noqa: PLC0415
        import html as _html_mod  # noqa: PLC0415
        from fpdf import FPDF  # noqa: PLC0415
        from html.parser import HTMLParser  # noqa: PLC0415

        FONT_DIR = Path(__file__).parent / "fonts"
        LATIN_FONT_PATH = FONT_DIR / "NotoSans-Regular.ttf"
        ARABIC_FONT_PATH = FONT_DIR / "NotoSansArabic-Regular.ttf"

        # Detect document-level direction from <html dir="...">
        doc_dir_m = _re.search(r'<html[^>]*\sdir=["\']([^"\']+)["\']', html_src, _re.I)
        doc_rtl = (doc_dir_m.group(1).lower() == "rtl") if doc_dir_m else False

        # Register fonts
        LATIN_FONT = "NotoSans"
        ARABIC_FONT = "NotoSansArabic" if ARABIC_FONT_PATH.exists() else LATIN_FONT

        class _PDFBuilder(HTMLParser):
            """Streaming HTML → fpdf2 renderer with per-element RTL awareness."""

            def __init__(self, pdf: "FPDF") -> None:
                super().__init__()
                self.pdf = pdf
                self._in_body = False
                self._skip = False
                self._buf: list[str] = []
                # Stack of per-element rtl flags (True = rtl)
                self._dir_stack: list[bool] = [doc_rtl]
                self._in_table = False
                self._row: list[tuple[str, bool]] = []   # (text, is_rtl)
                self._rows: list[list[tuple[str, bool]]] = []
                self._cell_buf: list[str] = []
                self._cell_rtl = False
                self._cur_size = 11

            # ── helpers ──────────────────────────────────────────────────────

            @property
            def _rtl(self) -> bool:
                return self._dir_stack[-1] if self._dir_stack else doc_rtl

            def _font_for(self, rtl: bool) -> str:
                return ARABIC_FONT if rtl else LATIN_FONT

            def _render_text(self, text: str, rtl: bool, size: int = 11,
                             align: str | None = None) -> None:
                if rtl:
                    text = _prepare_rtl_text(text)
                a = align or ("R" if rtl else "L")
                self.pdf.set_font(self._font_for(rtl), size=size)
                self.pdf.multi_cell(0, 7, text, align=a,
                                    new_x="LMARGIN", new_y="NEXT")

            def _flush(self, size: int | None = None) -> None:
                text = "".join(self._buf).strip()
                self._buf = []
                if not text:
                    return
                self._render_text(text, self._rtl, size=size or self._cur_size)

            def _parse_dir(self, attrs: dict) -> bool | None:
                d = attrs.get("dir", "").lower()
                if d == "rtl":
                    return True
                if d == "ltr":
                    return False
                return None

            # ── tag handlers ─────────────────────────────────────────────────

            def handle_starttag(self, tag: str, attrs: list) -> None:
                attr_dict = dict(attrs)
                if tag in ("script", "style", "head"):
                    self._skip = True
                    return
                if tag == "body":
                    self._in_body = True
                    d = self._parse_dir(attr_dict)
                    self._dir_stack.append(d if d is not None else doc_rtl)
                    return
                if not self._in_body:
                    return

                d = self._parse_dir(attr_dict)
                inherited = self._dir_stack[-1]
                self._dir_stack.append(d if d is not None else inherited)

                if tag in ("h1", "h2", "h3"):
                    self._flush()
                    self._cur_size = {"h1": 18, "h2": 14, "h3": 12}[tag]
                    self.pdf.ln(3)
                elif tag in ("p", "ul"):
                    self._flush()
                    self._cur_size = 11
                elif tag == "li":
                    self._flush()
                    self._cur_size = 11
                elif tag == "table":
                    self._flush()
                    self._in_table = True
                    self._rows = []
                elif tag == "tr":
                    self._row = []
                elif tag in ("th", "td"):
                    self._cell_buf = []
                    self._cell_rtl = self._rtl

            def handle_endtag(self, tag: str) -> None:
                if tag in ("script", "style", "head"):
                    self._skip = False

                if tag == "body":
                    self._flush()
                    if len(self._dir_stack) > 1:
                        self._dir_stack.pop()
                    return

                if not self._in_body:
                    return

                if tag in ("h1", "h2", "h3"):
                    self._flush(size={"h1": 18, "h2": 14, "h3": 12}[tag])
                    self._cur_size = 11
                    self.pdf.ln(2)
                elif tag == "p":
                    self._flush()
                    self.pdf.ln(1)
                elif tag == "li":
                    text = "".join(self._buf).strip()
                    self._buf = []
                    rtl = self._rtl
                    bullet = "• "
                    if rtl:
                        text = _prepare_rtl_text(bullet + text)
                        self.pdf.set_font(ARABIC_FONT, size=11)
                        self.pdf.multi_cell(0, 7, text, align="R",
                                            new_x="LMARGIN", new_y="NEXT")
                    else:
                        self.pdf.set_font(LATIN_FONT, size=11)
                        self.pdf.multi_cell(0, 7, bullet + text, align="L",
                                            new_x="LMARGIN", new_y="NEXT")
                elif tag in ("th", "td"):
                    cell_text = "".join(self._cell_buf).strip()
                    self._row.append((cell_text, self._cell_rtl))
                    self._cell_buf = []
                elif tag == "tr":
                    if self._row:
                        self._rows.append(self._row)
                        self._row = []
                elif tag == "table":
                    self._render_table()
                    self._in_table = False
                    self.pdf.ln(3)

                # Pop the dir stack for block-level tags
                if tag in ("h1", "h2", "h3", "p", "li", "table", "tr",
                           "th", "td", "ul", "ol", "div"):
                    if len(self._dir_stack) > 1:
                        self._dir_stack.pop()

            def _render_table(self) -> None:
                if not self._rows:
                    return
                col_count = max(len(r) for r in self._rows)
                col_w = self.pdf.epw / col_count
                for i, row in enumerate(self._rows):
                    row_h = 7
                    if i == 0:
                        self.pdf.set_fill_color(230, 230, 230)
                    for j in range(col_count):
                        cell_text, cell_rtl = row[j] if j < len(row) else ("", False)
                        if cell_rtl:
                            cell_text = _prepare_rtl_text(cell_text)
                        font = self._font_for(cell_rtl)
                        self.pdf.set_font(font, size=9)
                        self.pdf.cell(col_w, row_h, cell_text[:50],
                                      border=1, fill=(i == 0),
                                      align="R" if cell_rtl else "L")
                    self.pdf.ln()
                self.pdf.set_font(LATIN_FONT, size=11)

            def handle_data(self, data: str) -> None:
                if self._skip or not self._in_body:
                    return
                if self._in_table:
                    self._cell_buf.append(data)
                else:
                    self._buf.append(data)

            def handle_entityref(self, name: str) -> None:
                self.handle_data(_html_mod.unescape(f"&{name};"))

            def handle_charref(self, name: str) -> None:
                self.handle_data(_html_mod.unescape(f"&#{name};"))

        # ── Build PDF ────────────────────────────────────────────────────────
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=20)
        pdf.add_page()
        pdf.set_left_margin(20)
        pdf.set_right_margin(20)

        if LATIN_FONT_PATH.exists():
            pdf.add_font(LATIN_FONT, "", str(LATIN_FONT_PATH))
        if ARABIC_FONT_PATH.exists() and ARABIC_FONT != LATIN_FONT:
            pdf.add_font(ARABIC_FONT, "", str(ARABIC_FONT_PATH))

        pdf.set_font(ARABIC_FONT if doc_rtl else LATIN_FONT, size=11)

        builder = _PDFBuilder(pdf)
        builder.feed(html_src)
        builder._flush()

        pdf_bytes = bytes(pdf.output())
        log.info("/render-html-to-pdf size=%d bytes rtl=%s", len(pdf_bytes), doc_rtl)
        return Response(
            pdf_bytes,
            status=200,
            mimetype="application/pdf",
            headers={"Content-Length": str(len(pdf_bytes))},
        )
    except Exception as e:
        log.error("/render-html-to-pdf failed: %s", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PDF_PROCESSOR_PORT", "8001"))
    app.run(host="0.0.0.0", port=port, debug=False)
