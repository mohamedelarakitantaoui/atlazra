# References — Atlazra homepage redesign

## 1. frmfv2.jerrary.com ("DIMA MAGHRIB", the user's favourite)
- Palette: bg deep green #062B1B, ink bone #F3EFE8 / #FBF4E6, accent red #8A0A1D (hero), highlight gold #F1D38C on dark; cream sections #F6F2EA / #F4F1EA with dark green ink #14241B.
- Type: Archivo 800–900 uppercase for every h2 (70–128px, line-height .88, tracking ~-0.005em); hero word 320px/900; Instrument Serif only for one statement line ("Chaque Mondial a son cri."); Inter Tight body; small spaced mono-like labels ("03 — LE MAILLOT OFFICIEL · PUMA 2026").
- Section anatomy: sandwich hero (giant DIMA MAGHRIB, the star replaces the O, photo mosaic behind) → album (Panini sticker book that opens) → players on a pitch formation → jersey anatomy (zoom details, "03 / 10" counter) → vestiaire rail → flocage (configurator) → goals timeline → videos → clothesline of pinned polaroids ("épinglée") → full-bleed photo chapters ("LE 12E HOMME", "05 / 09", place · date label) → news → next match → 6 stadiums → 2030 → footer with giant DIMA MAGHRIB.
- What makes it feel made: EVERY section is a physical metaphor from football culture (sticker album, clothesline polaroids, jersey, pitch). Real photos everywhere. Numbered chapters + place/date labels.
- Motion: long pinned scroll sequences (page 64 900 px tall), custom JS (no GSAP/Lenis detected).
- Weak spots: Cloudflare wall → blank first paint for several seconds; 65 000 px page = heavy; grey placeholder boxes where photos fail; giant pinned sections are tiring on mobile.
- Patterns to keep: the symbol inside the giant word; one physical metaphor per section; numbered chapter labels with place/date; giant word in footer; cream/dark band alternation.

## 2. west8.com / aspect-studios.com / bestique.co.uk / tomstuartsmith.co.uk (niche)
- All: one full-bleed photo hero, tiny nav, almost no copy, white or photo backgrounds, project = place + year.
- Weak spot for Atlazra: they depend on professional photography, which Atlazra does not have yet. Atlazra's own asset is the 3D model.

## 3. Current Atlazra site (localhost:4321)
- KEEP: the 3D garden island (drag, Terrain actuel / Projet Atlazra), FR/AR/EN routing, the real copy (hero, 4 steps, services), honest placeholders, contact form, accessibility work.
- CHANGE: generic two-column hero in a grey card, system font, white + grey with almost no brand colour, the gold of the logo unused, sections all look the same.
