"""
apply_translations.py — Layout-preserving PDF translation via PyMuPDF.

Strategy:
  1. Render each original page as a high-DPI raster image (preserves ALL visual
     elements: backgrounds, logos, graphics, borders — pixel-perfect).
  2. Place the raster image as a full-page background on a new PDF page.
  3. For each text block that has a translation, draw a filled rect matching
     the sampled background color (whiting-out the original text), then insert
     the translated text using NotoSansArabic TTF (for RTL) or Helvetica (LTR).
  4. Arabic text is properly reshaped + bidi-ordered before rendering.

Usage:
  python3 scripts/apply_translations.py \
      <input_pdf> <translations_json_path> <output_pdf> [target_lang]
"""

import sys
import json
import os
import re
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FONTS_DIR = os.path.join(SCRIPT_DIR, "fonts")
ARABIC_FONT_TTF = os.path.join(FONTS_DIR, "NotoSansArabic-Regular.ttf")
ARABIC_FONT_BOLD_TTF = os.path.join(FONTS_DIR, "NotoSansArabic-Bold.ttf")

RENDER_DPI = 150  # DPI for page-image background
RENDER_SCALE = RENDER_DPI / 72.0  # PyMuPDF default is 72 DPI


def is_rtl(lang: str) -> bool:
    rtl_codes = {"ar", "he", "fa", "ur", "arabic", "hebrew", "farsi", "persian", "urdu"}
    return lang.strip().lower() in rtl_codes


def normalize(text: str) -> str:
    return " ".join(text.split()).strip()


def build_lookup(translations: dict) -> dict:
    return {normalize(k): v for k, v in translations.items() if v and normalize(k)}


def shape_arabic(text: str) -> str:
    """Reshape Arabic characters and apply bidi algorithm for correct visual order."""
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        reshaped = arabic_reshaper.reshape(text)
        return get_display(reshaped)
    except Exception:
        return text


def sample_background(page, rect) -> tuple:
    """Sample the average background color under a rect. Returns (r,g,b) 0..1."""
    try:
        import fitz
        clip = fitz.Rect(rect)
        mat = fitz.Matrix(0.5, 0.5)
        pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
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


def get_text_color(span: dict) -> tuple:
    """Extract text color from a span dict. Returns (r,g,b) 0..1."""
    raw = span.get("color", 0)
    if isinstance(raw, int):
        r = ((raw >> 16) & 0xFF) / 255
        g = ((raw >> 8) & 0xFF) / 255
        b = (raw & 0xFF) / 255
        return (r, g, b)
    return (0.0, 0.0, 0.0)


def apply_translations(input_pdf: str, translations: dict, output_pdf: str,
                       target_lang: str = "en") -> int:
    import fitz

    rtl = is_rtl(target_lang)
    lookup = build_lookup(translations)

    if not lookup:
        sys.stderr.write("[apply_translations] No translations — copying as-is.\n")
        import shutil
        shutil.copy2(input_pdf, output_pdf)
        return 0

    # Pre-load Arabic font data if available
    arabic_font_data = None
    arabic_font_name = "helv"
    if rtl and os.path.exists(ARABIC_FONT_TTF):
        try:
            with open(ARABIC_FONT_TTF, "rb") as f:
                arabic_font_data = f.read()
            arabic_font_name = "NotoArabic"
            sys.stderr.write("[apply_translations] Loaded NotoSansArabic-Regular TTF\n")
        except Exception as e:
            sys.stderr.write(f"[apply_translations] Could not load Arabic font: {e}\n")

    src_doc = fitz.open(input_pdf)
    out_doc = fitz.open()
    replaced_total = 0
    mat = fitz.Matrix(RENDER_SCALE, RENDER_SCALE)

    for page_idx in range(len(src_doc)):
        src_page = src_doc[page_idx]
        page_rect = src_page.rect  # original page size in points

        # Step 1: Render the original page as a high-DPI image
        pix = src_page.get_pixmap(matrix=mat, alpha=False)

        # Step 2: Create a new output page at the same size as the original
        out_page = out_doc.new_page(width=page_rect.width, height=page_rect.height)

        # Step 3: Insert the rendered image as a full-page background
        img_bytes = pix.tobytes("png")
        out_page.insert_image(page_rect, stream=img_bytes)

        # Step 4: Extract text blocks from the original page
        raw = src_page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)
        blocks = raw.get("blocks", [])

        replacements = []

        for block in blocks:
            if block.get("type") != 0:
                continue
            spans_in_block = []
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    spans_in_block.append(span)
            if not spans_in_block:
                continue

            block_text = normalize(
                " ".join(" ".join(s.get("text", "").split()) for s in spans_in_block)
            )
            if len(block_text) < 2:
                continue

            translated = lookup.get(block_text)

            if not translated:
                # Try fuzzy prefix match for minor whitespace/hyphenation differences
                key_prefix = block_text[:max(8, len(block_text) - 4)]
                for k, v in lookup.items():
                    if (k.startswith(key_prefix) or
                            key_prefix.startswith(k[:max(8, len(k) - 4)])):
                        translated = v
                        break

            if not translated:
                continue

            # Use the dominant font size and color from the first span
            first_span = spans_in_block[0]
            font_size = max(first_span.get("size", 11), 7)
            text_color = get_text_color(first_span)

            bbox = fitz.Rect(block["bbox"])
            # Sample the background color from the ORIGINAL page
            bg_color = sample_background(src_page, bbox)

            # Expand cover rect slightly to avoid edge artefacts
            cover = fitz.Rect(bbox.x0 - 1, bbox.y0 - 1, bbox.x1 + 1, bbox.y1 + 1)

            replacements.append((cover, translated, font_size, text_color, bg_color))

        # Step 5: Apply replacements on the output page
        for (cover, translated, font_size, text_color, bg_color) in replacements:
            # Cover the (now-rasterised) original text with a filled rect
            out_page.draw_rect(cover, color=bg_color, fill=bg_color, width=0, overlay=True)

            text_rect = fitz.Rect(
                cover.x0 + 1, cover.y0 + 1,
                cover.x1 - 1, cover.y1 - 1,
            )

            # Shape Arabic text before rendering
            display_text = shape_arabic(translated) if rtl else translated
            align = fitz.TEXT_ALIGN_RIGHT if rtl else fitz.TEXT_ALIGN_LEFT

            if arabic_font_data and rtl:
                # Use registered NotoArabic TTF
                try:
                    out_page.insert_textbox(
                        text_rect,
                        display_text,
                        fontsize=font_size,
                        fontbuffer=arabic_font_data,
                        fontname=arabic_font_name,
                        color=text_color,
                        align=align,
                        overlay=True,
                    )
                    replaced_total += 1
                    continue
                except Exception as e:
                    sys.stderr.write(f"[apply_translations] textbox error: {e}\n")
            else:
                # Non-Arabic: use helv (Helvetica)
                try:
                    out_page.insert_textbox(
                        text_rect,
                        display_text,
                        fontsize=font_size,
                        fontname="helv",
                        color=text_color,
                        align=align,
                        overlay=True,
                    )
                    replaced_total += 1
                    continue
                except Exception as e:
                    sys.stderr.write(f"[apply_translations] textbox error: {e}\n")

            # Last-resort: insert_text at top-left of rect
            try:
                fb = arabic_font_data if (rtl and arabic_font_data) else None
                fn = arabic_font_name if (rtl and arabic_font_data) else "helv"
                kw = {"fontbuffer": fb, "fontname": fn} if fb else {"fontname": fn}
                out_page.insert_text(
                    (text_rect.x0, text_rect.y0 + font_size),
                    display_text,
                    fontsize=max(font_size * 0.85, 7),
                    color=text_color,
                    overlay=True,
                    **kw,
                )
                replaced_total += 1
            except Exception:
                pass  # Skip this block

    sys.stderr.write(
        f"[apply_translations] Replaced {replaced_total} blocks "
        f"across {len(src_doc)} pages (image-background mode).\n"
    )

    out_doc.save(output_pdf, garbage=4, deflate=True)
    out_doc.close()
    src_doc.close()
    return replaced_total


def main():
    if len(sys.argv) < 4:
        sys.stderr.write(
            "Usage: apply_translations.py <input_pdf> <translations_json> "
            "<output_pdf> [target_lang]\n"
        )
        sys.exit(1)

    input_pdf = sys.argv[1]
    translations_json_path = sys.argv[2]
    output_pdf = sys.argv[3]
    target_lang = sys.argv[4] if len(sys.argv) > 4 else "en"

    if not os.path.exists(input_pdf):
        sys.stderr.write(f"[apply_translations] Input not found: {input_pdf}\n")
        sys.exit(1)

    with open(translations_json_path, "r", encoding="utf-8") as f:
        translations = json.load(f)

    replaced = apply_translations(input_pdf, translations, output_pdf, target_lang)
    print(json.dumps({"output": output_pdf, "blocks_replaced": replaced}))
    sys.exit(0)


if __name__ == "__main__":
    main()
