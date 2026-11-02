# design-tokens.md

Base (decided 2026-11-02): WHITE page (#FFFFFF). Emerald is the brand ink (giant word, headings, buttons, footer band, plan/compare frames); gold is the accent (CTAs, pins, monogram). Light bands alternate white / bone; only the footer is a full emerald band and the contact band is gold.

Accent reason: gold is the metal of the Atlazra monogram, emerald the panel it is mounted on. Every neutral is pulled from those two (warm bone, emerald inks), so nothing is a default grey.

- --ink-950 #112F22 (deepest band) · --ink-900 #1B4130 (hero, softened 2026-11-02) · --ink-800 #153829 (alt dark band) · text on gold stays #0A2618 · --ink-on-bone #0F2419
- --bone-50 #F6F2E9 · --bone-100 #EDE6D6 · --bone-line rgba(15,36,25,.12)
- --accent #C9A26B (gold) · --accent-ink #0A2618 (text on gold) · --accent-text-on-bone #7D5E2E (gold-brown text, 5:1 on bone)
- muted on dark: rgba(246,242,233,.76) · muted on white/bone: #465649 · gold is never small text on white: use --accent-text #7A5B2C
- Display: Big Shoulders Display 800, uppercase, tracking -0.01em, lh .86; hero word clamp(120px, 27vw, 420px)
- Body: Manrope 400/600 · Labels: IBM Plex Mono 500, 12–13px uppercase, tracking .12em · Arabic: IBM Plex Sans Arabic 400/600 (display AR 700)
- Radius: 999px pills, 20px media, 0 for lists (hairlines)
- Space: 4/8/12/16/24/32/48/64/96/128 · ease-out cubic-bezier(.22,1,.36,1) · 0.4 / 0.8 / 1.2 s

Six moves:
1. Sandwich hero: giant ATLAZRA (back) → live 3D garden breaking the word (middle) → corner UI (front). Monogram replaces the first A.
2. One world + one accent: emerald + gold (above).
3. Poster corners: logo TL, nav TC, lang+CTA TR, h1+CTA ML, 4-step index MR, toggle BL, towns BC, drag hint BR.
4. Symbol: the monogram leaf. Bullets, dividers, slider handle, footer word, favicon.
5. Type: Big Shoulders Display heavy condensed + Manrope + Plex Mono.
6. Editorial: mono labels "01 — LE PLAN COTÉ", [01] numbering, hairline lists, one marquee (towns), giant word footer, chapter counter.

Section metaphors (from the landscaper's world, like the sticker album/clothesline in the reference): architect's dimensioned plan on blueprint grid · before/after wipe · nursery plant tags on twine · site notebook pages.
