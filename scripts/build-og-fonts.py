"""Merge IBM Plex Sans Arabic's Arabic and Latin files into TTFs for OG images.

The Open Graph images are drawn by Sharp (Pango + HarfBuzz), which shapes
Arabic correctly but needs one TrueType file per weight covering both
scripts. Fontsource ships them as separate WOFF2 subsets.

Run after changing weights:
    python scripts/build-og-fonts.py
Requires fonttools and brotli (pip install fonttools brotli). The outputs in
src/assets/fonts/og/ are committed; the build does not run this script.
"""

from pathlib import Path

from fontTools.merge import Merger
from fontTools.ttLib import TTFont

SOURCE = Path("node_modules/@fontsource/ibm-plex-sans-arabic/files")
TARGET = Path("src/assets/fonts/og")
WEIGHTS = (400, 600)


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    for weight in WEIGHTS:
        parts = []
        for subset in ("arabic", "latin"):
            font = TTFont(SOURCE / f"ibm-plex-sans-arabic-{subset}-{weight}-normal.woff2")
            font.flavor = None
            part = TARGET / f".{subset}-{weight}.ttf"
            font.save(part)
            parts.append(part)
        output = TARGET / f"ibm-plex-sans-arabic-{weight}.ttf"
        Merger().merge([str(part) for part in parts]).save(output)
        for part in parts:
            part.unlink()
        print(f"{output}: {output.stat().st_size} bytes")


if __name__ == "__main__":
    main()
