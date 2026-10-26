"""
apply_ocr_translations.py — Layout-preserving translation overlay for
OCR-derived projects.

Unlike `apply_translations.py`, this script does NOT rely on extractable
text inside the source PDF (scanned originals don't have any). Instead
it consumes the persisted OCR layout — `OcrRequest.structuredLayout` —
which carries `{ pages: [{ pageNum, width?, height?, blocks: [{ text,
bbox? }] }] }`, and overlays each block's translation back onto the
original page bitmap at the bbox the OCR engine reported.

It supports two source shapes:
  * PDF — each page is rasterised at high DPI as the new page background;
    OCR bboxes are interpreted in PDF point coords (PyMuPDF block bboxes)
    or scaled from a reference width/height when one is supplied.
  * Image (jpg/png/webp) — a single-page PDF is built at the image's
    pixel dimensions (converted to points), the image is placed full
    bleed, and OCR bboxes are interpreted in image pixel coords.

Output is a PDF that looks like the original scan with the translated
text drawn into the bounding boxes.

Usage:
  python3 scripts/apply_ocr_translations.py <input_file> \
      <ocr_layout_json> <translations_json> <output_pdf> [target_lang] \
      [source_mime]
"""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FONTS_DIR = os.path.join(SCRIPT_DIR, "fonts")
ARABIC_FONT_TTF = os.path.join(FONTS_DIR, "NotoSansArabic-Regular.ttf")

RENDER_DPI = 150
RENDER_SCALE = RENDER_DPI / 72.0


def is_rtl(lang: str) -> bool:
    rtl_codes = {"ar", "he", "fa", "ur",
                 "arabic", "hebrew", "farsi", "persian", "urdu"}
    return (lang or "").strip().lower() in rtl_codes


def normalize(text: str) -> str:
    return " ".join((text or "").split()).strip()


def build_lookup(translations: dict) -> dict:
    out = {}
    for k, v in translations.items():
        nk = normalize(k)
        if nk and v:
            out[nk] = v
            out[nk.lower()] = v
    return out


def shape_arabic(text: str) -> str:
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        return get_display(arabic_reshaper.reshape(text))
    except Exception:
        return text


def lookup_translation(block_text: str, lookup: dict):
    nk = normalize(block_text)
    if not nk:
        return None
    if nk in lookup:
        return lookup[nk]
    low = nk.lower()
    if low in lookup:
        return lookup[low]
    # Crude prefix match for minor whitespace / hyphenation differences
    head = nk[: max(8, len(nk) - 4)]
    for k, v in lookup.items():
        if k.startswith(head) or head.startswith(k[: max(8, len(k) - 4)]):
            return v
    return None


def sample_background(page, rect):
    try:
        import fitz
        clip = fitz.Rect(rect)
        if clip.is_empty:
            return (1.0, 1.0, 1.0)
        pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5),
                              clip=clip, alpha=False)
        samples = pix.samples
        if not samples:
            return (1.0, 1.0, 1.0)
        n = min(len(samples) // 3, 128)
        rs = gs = bs = 0
        for i in range(n):
            rs += samples[i * 3]
            gs += samples[i * 3 + 1]
            bs += samples[i * 3 + 2]
        n = max(n, 1)
        return (rs / n / 255, gs / n / 255, bs / n / 255)
    except Exception:
        return (1.0, 1.0, 1.0)


def overlay_text(out_page, cover_rect, translated, font_size,
                 arabic_font_data, rtl, text_color=(0.0, 0.0, 0.0),
                 bg_color=(1.0, 1.0, 1.0)):
    import fitz

    out_page.draw_rect(cover_rect, color=bg_color, fill=bg_color,
                       width=0, overlay=True)

    text_rect = fitz.Rect(cover_rect.x0 + 1, cover_rect.y0 + 1,
                          cover_rect.x1 - 1, cover_rect.y1 - 1)
    display_text = shape_arabic(translated) if rtl else translated
    align = fitz.TEXT_ALIGN_RIGHT if rtl else fitz.TEXT_ALIGN_LEFT

    if rtl and arabic_font_data:
        try:
            out_page.insert_textbox(
                text_rect, display_text,
                fontsize=font_size, fontbuffer=arabic_font_data,
                fontname="NotoArabic", color=text_color,
                align=align, overlay=True,
            )
            return True
        except Exception as e:
            sys.stderr.write(f"[apply_ocr] textbox(arabic) error: {e}\n")

    try:
        out_page.insert_textbox(
            text_rect, display_text,
            fontsize=font_size, fontname="helv",
            color=text_color, align=align, overlay=True,
        )
        return True
    except Exception as e:
        sys.stderr.write(f"[apply_ocr] textbox error: {e}\n")

    try:
        kw = {}
        if rtl and arabic_font_data:
            kw = {"fontbuffer": arabic_font_data, "fontname": "NotoArabic"}
        else:
            kw = {"fontname": "helv"}
        out_page.insert_text(
            (text_rect.x0, text_rect.y0 + font_size),
            display_text,
            fontsize=max(font_size * 0.85, 7),
            color=text_color, overlay=True, **kw,
        )
        return True
    except Exception:
        return False


def estimate_font_size(bbox, text):
    """Pick a font size that fits the bbox height comfortably."""
    h = max(bbox[3] - bbox[1], 8)
    # Height in points → use 70% of the box height as font size
    return max(7.0, min(h * 0.7, 28.0))


def apply_pdf_overlay(input_pdf, layout_pages, lookup, output_pdf,
                      target_lang, arabic_font_data):
    import fitz

    src_doc = fitz.open(input_pdf)
    out_doc = fitz.open()
    rtl = is_rtl(target_lang)
    replaced_total = 0

    layout_by_num = {}
    for entry in layout_pages:
        pn = entry.get("pageNum") or entry.get("page_num") or 0
        layout_by_num[int(pn)] = entry

    mat = fitz.Matrix(RENDER_SCALE, RENDER_SCALE)

    for page_idx in range(len(src_doc)):
        src_page = src_doc[page_idx]
        page_rect = src_page.rect
        page_w_pts = page_rect.width
        page_h_pts = page_rect.height

        # Render original page as full-bleed background image
        pix = src_page.get_pixmap(matrix=mat, alpha=False)
        out_page = out_doc.new_page(width=page_w_pts, height=page_h_pts)
        out_page.insert_image(page_rect, stream=pix.tobytes("png"))

        layout = layout_by_num.get(page_idx + 1) or layout_by_num.get(page_idx)
        if not layout:
            continue
        blocks = layout.get("blocks") or []

        # Decide bbox coordinate space. If the OCR layout reports a
        # reference width/height, scale bboxes proportionally; otherwise
        # assume bboxes are already in PDF point coords (PyMuPDF case).
        ref_w = layout.get("width")
        ref_h = layout.get("height")
        scale_x = page_w_pts / ref_w if ref_w else 1.0
        scale_y = page_h_pts / ref_h if ref_h else 1.0

        for block in blocks:
            text = block.get("text") or ""
            translated = lookup_translation(text, lookup)
            if not translated:
                continue
            bbox = block.get("bbox")
            if not (isinstance(bbox, (list, tuple)) and len(bbox) == 4):
                continue
            x0 = bbox[0] * scale_x
            y0 = bbox[1] * scale_y
            x1 = bbox[2] * scale_x
            y1 = bbox[3] * scale_y
            if x1 - x0 < 4 or y1 - y0 < 4:
                continue

            cover = fitz.Rect(x0 - 1, y0 - 1, x1 + 1, y1 + 1)
            bg = sample_background(src_page, fitz.Rect(x0, y0, x1, y1))
            font_size = estimate_font_size((x0, y0, x1, y1), text)

            ok = overlay_text(out_page, cover, translated, font_size,
                              arabic_font_data, rtl, bg_color=bg)
            if ok:
                replaced_total += 1

    out_doc.save(output_pdf, garbage=4, deflate=True)
    out_doc.close()
    src_doc.close()
    return replaced_total


def apply_image_overlay(input_image, layout_pages, lookup, output_pdf,
                        target_lang, arabic_font_data):
    import fitz

    rtl = is_rtl(target_lang)
    replaced_total = 0

    pix = fitz.Pixmap(input_image)
    img_w = pix.width
    img_h = pix.height
    out_doc = fitz.open()
    # Create a PDF page sized to the image (1 px == 1 pt — keeps OCR
    # bbox coordinates one-to-one with rendered geometry).
    out_page = out_doc.new_page(width=img_w, height=img_h)
    out_page.insert_image(fitz.Rect(0, 0, img_w, img_h), pixmap=pix)

    # Single-page image: take the first layout entry (all blocks).
    layout = layout_pages[0] if layout_pages else {"blocks": []}
    blocks = layout.get("blocks") or []

    ref_w = layout.get("width") or img_w
    ref_h = layout.get("height") or img_h
    scale_x = img_w / ref_w if ref_w else 1.0
    scale_y = img_h / ref_h if ref_h else 1.0

    for block in blocks:
        text = block.get("text") or ""
        translated = lookup_translation(text, lookup)
        if not translated:
            continue
        bbox = block.get("bbox")
        if not (isinstance(bbox, (list, tuple)) and len(bbox) == 4):
            continue
        x0 = bbox[0] * scale_x
        y0 = bbox[1] * scale_y
        x1 = bbox[2] * scale_x
        y1 = bbox[3] * scale_y
        if x1 - x0 < 4 or y1 - y0 < 4:
            continue

        cover = fitz.Rect(x0 - 1, y0 - 1, x1 + 1, y1 + 1)
        font_size = estimate_font_size((x0, y0, x1, y1), text)
        ok = overlay_text(out_page, cover, translated, font_size,
                          arabic_font_data, rtl,
                          bg_color=(1.0, 1.0, 1.0))
        if ok:
            replaced_total += 1

    out_doc.save(output_pdf, garbage=4, deflate=True)
    out_doc.close()
    return replaced_total


def main():
    if len(sys.argv) < 5:
        sys.stderr.write(
            "Usage: apply_ocr_translations.py <input_file> "
            "<ocr_layout_json> <translations_json> <output_pdf> "
            "[target_lang] [source_mime]\n"
        )
        sys.exit(1)

    input_file = sys.argv[1]
    layout_json_path = sys.argv[2]
    translations_json_path = sys.argv[3]
    output_pdf = sys.argv[4]
    target_lang = sys.argv[5] if len(sys.argv) > 5 else "en"
    source_mime = sys.argv[6] if len(sys.argv) > 6 else ""

    if not os.path.exists(input_file):
        sys.stderr.write(f"[apply_ocr] Input not found: {input_file}\n")
        sys.exit(1)

    with open(layout_json_path, "r", encoding="utf-8") as f:
        layout = json.load(f) or {}
    with open(translations_json_path, "r", encoding="utf-8") as f:
        translations = json.load(f) or {}

    layout_pages = layout.get("pages") or []
    lookup = build_lookup(translations)

    arabic_font_data = None
    if is_rtl(target_lang) and os.path.exists(ARABIC_FONT_TTF):
        try:
            with open(ARABIC_FONT_TTF, "rb") as f:
                arabic_font_data = f.read()
        except Exception as e:
            sys.stderr.write(f"[apply_ocr] arabic font load failed: {e}\n")

    is_image = (
        source_mime.startswith("image/") or
        input_file.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    )

    if is_image:
        replaced = apply_image_overlay(
            input_file, layout_pages, lookup, output_pdf,
            target_lang, arabic_font_data,
        )
    else:
        replaced = apply_pdf_overlay(
            input_file, layout_pages, lookup, output_pdf,
            target_lang, arabic_font_data,
        )

    sys.stderr.write(
        f"[apply_ocr] Replaced {replaced} block(s) "
        f"across {len(layout_pages)} layout page(s).\n"
    )
    print(json.dumps({"output": output_pdf, "blocks_replaced": replaced}))
    sys.exit(0)


if __name__ == "__main__":
    main()
