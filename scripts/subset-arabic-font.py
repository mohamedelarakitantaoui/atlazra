"""Subset the self-hosted IBM Plex Sans Arabic files to the ranges the site uses.

Run after changing weights or adding characters outside these ranges:
    python scripts/subset-arabic-font.py
Requires fonttools and brotli (pip install fonttools brotli). The outputs in
src/assets/fonts/ are committed; the build does not run this script.
"""

from pathlib import Path

from fontTools import subset
from fontTools.merge import Merger
from fontTools.ttLib import TTFont

SOURCE = Path("node_modules/@fontsource/ibm-plex-sans-arabic/files")
TARGET = Path("src/assets/fonts")
WEIGHTS = (400, 500, 600)

# Keep these in sync with the unicode-range descriptors in src/styles/fonts.css.
RANGES = {
    # Spaces, bidi marks (ZWNJ/ZWJ/LRM/RLM), general punctuation (– — ’ …),
    # Arabic punctuation (، ؛ ؟), letters, tatweel and harakat. Spaces and
    # dashes live here so all-Arabic text at a weight does not also download
    # that weight's Latin file (Phase 7: /ar/ fetched Latin 500 for spaces and
    # the en dash in the address). Built from the Arabic and Latin files
    # merged, because the Arabic one has no dash glyphs.
    "arabic": "U+0020,U+00A0,U+060C,U+061B,U+061F,U+0621-0652,U+200C-200F,U+2010-2027",
    # Rest of Basic Latin and Latin-1 (©, ·, ×, digits, French accents).
    "latin": "U+0021-007E,U+00A1-00FF",
}


def unicodes(spec: str) -> list[int]:
    result: list[int] = []
    for part in spec.split(","):
        start, _, end = part.removeprefix("U+").partition("-")
        result.extend(range(int(start, 16), int(end or start, 16) + 1))
    return result


def merged(weight: int) -> Path:
    """Arabic and Latin files of one weight as a single temporary TTF."""
    parts = []
    for name in ("arabic", "latin"):
        font = TTFont(SOURCE / f"ibm-plex-sans-arabic-{name}-{weight}-normal.woff2")
        font.flavor = None
        part = TARGET / f".{name}-{weight}.ttf"
        font.save(part)
        parts.append(part)
    output = TARGET / f".merged-{weight}.ttf"
    Merger().merge([str(part) for part in parts]).save(output)
    for part in parts:
        part.unlink()
    return output


TARGET.mkdir(parents=True, exist_ok=True)
for weight in WEIGHTS:
    for name, spec in RANGES.items():
        source = SOURCE / f"ibm-plex-sans-arabic-{name}-{weight}-normal.woff2"
        if name == "arabic":
            source = merged(weight)
        output = TARGET / f"ibm-plex-sans-arabic-{name}-{weight}.woff2"
        options = subset.Options()
        options.flavor = "woff2"
        # Arabic shaping (init/medi/fina, ligatures, mark positioning) lives in
        # GSUB/GPOS; keep every feature so joined forms survive the subset.
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.notdef_outline = True
        font = subset.load_font(str(source), options)
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=unicodes(spec))
        subsetter.subset(font)
        subset.save_font(font, str(output), options)
        print(f"{output}  {source.stat().st_size} -> {output.stat().st_size} bytes")
        font.close()
        if source.name.startswith(".merged-"):
            source.unlink()
