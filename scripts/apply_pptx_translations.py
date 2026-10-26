"""
apply_pptx_translations.py — Apply translated text back into a PPTX file.

Reads a translations JSON { "<source_text>": "<translated_text>", ... }
and replaces matching text in each shape's text frames, preserving
all formatting (font, size, color, bold, italic, alignment).

Usage:
  python3 scripts/apply_pptx_translations.py \
      <input.pptx> <translations_json_path> <output.pptx> [target_lang]
"""

import sys
import json
import os
import shutil


def normalize(text: str) -> str:
    return " ".join(text.split()).strip()


def is_rtl(lang: str) -> bool:
    rtl_codes = {"ar", "he", "fa", "ur", "arabic", "hebrew", "farsi", "persian", "urdu"}
    return lang.strip().lower() in rtl_codes


def shape_arabic(text: str) -> str:
    """Reshape + bidi-order Arabic text for correct visual presentation."""
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        return get_display(arabic_reshaper.reshape(text))
    except Exception:
        return text


def apply_translations_to_pptx(
    input_pptx: str,
    translations: dict,
    output_pptx: str,
    target_lang: str = "en"
) -> int:
    from pptx import Presentation
    from pptx.util import Pt
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN
    import copy

    rtl = is_rtl(target_lang)
    lookup = {normalize(k): v for k, v in translations.items() if v and normalize(k)}

    if not lookup:
        shutil.copy2(input_pptx, output_pptx)
        return 0

    prs = Presentation(input_pptx)
    replaced = 0

    for slide in prs.slides:
        for shape in slide.shapes:
            if not shape.has_text_frame:
                continue
            tf = shape.text_frame
            for para in tf.paragraphs:
                full_text = normalize(para.text)
                if len(full_text) < 2:
                    continue

                translated = lookup.get(full_text)
                if not translated:
                    # Try prefix match
                    key_prefix = full_text[:max(8, len(full_text) - 4)]
                    for k, v in lookup.items():
                        if (k.startswith(key_prefix) or
                                key_prefix.startswith(k[:max(8, len(k) - 4)])):
                            translated = v
                            break

                if not translated:
                    continue

                # Shape Arabic text if needed
                display_text = shape_arabic(translated) if rtl else translated

                # Preserve style from the first run that has content
                ref_run = None
                for run in para.runs:
                    if run.text.strip():
                        ref_run = run
                        break

                # Clear all runs and set the translated text in the first run,
                # restoring the reference run's formatting
                for run in para.runs:
                    run.text = ""

                if para.runs:
                    first_run = para.runs[0]
                    first_run.text = display_text
                    # Restore formatting from ref_run if we had one
                    if ref_run and ref_run is not first_run:
                        try:
                            if ref_run.font.bold is not None:
                                first_run.font.bold = ref_run.font.bold
                            if ref_run.font.italic is not None:
                                first_run.font.italic = ref_run.font.italic
                            if ref_run.font.size is not None:
                                first_run.font.size = ref_run.font.size
                            if ref_run.font.color.type is not None:
                                first_run.font.color.rgb = ref_run.font.color.rgb
                        except Exception:
                            pass
                else:
                    # No runs: add one
                    from pptx.util import Pt
                    run = para.add_run()
                    run.text = display_text

                # Set RTL paragraph direction via XML if needed
                if rtl:
                    try:
                        from lxml import etree
                        pPr = para._p.get_or_add_pPr()
                        pPr.set("rtl", "1")
                        # Also set alignment to right for RTL
                        para.alignment = PP_ALIGN.RIGHT
                    except Exception:
                        pass

                replaced += 1

    prs.save(output_pptx)
    sys.stderr.write(f"[apply_pptx] Replaced {replaced} paragraphs.\n")
    return replaced


def main():
    if len(sys.argv) < 4:
        sys.stderr.write(
            "Usage: apply_pptx_translations.py <input.pptx> "
            "<translations_json> <output.pptx> [target_lang]\n"
        )
        sys.exit(1)

    input_pptx = sys.argv[1]
    translations_json = sys.argv[2]
    output_pptx = sys.argv[3]
    target_lang = sys.argv[4] if len(sys.argv) > 4 else "en"

    if not os.path.exists(input_pptx):
        sys.stderr.write(f"Input not found: {input_pptx}\n")
        sys.exit(1)

    with open(translations_json, "r", encoding="utf-8") as f:
        translations = json.load(f)

    replaced = apply_translations_to_pptx(
        input_pptx, translations, output_pptx, target_lang
    )
    print(json.dumps({"output": output_pptx, "paragraphs_replaced": replaced}))
    sys.exit(0)


if __name__ == "__main__":
    main()
