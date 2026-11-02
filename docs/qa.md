# QA report — Phase 7 (SEO, performance, accessibility)

Date: 2026-11-02. Local production build (`pnpm build`), served by
`scripts/serve-built.ts`. Node 24, Chromium from Playwright. The two
`exemple-*` projects were published locally for these runs so the project
grid, story, lightbox and slider exist, then set back to `draft`.

How to rerun:

- Lighthouse and screenshots: `node scripts/audit-pages.ts <label> --lighthouse --runs=3`
- axe: `PROJECT_EXAMPLES=1 AXE_REPORT=artifacts/phase-7/axe pnpm exec playwright test tests/a11y.spec.ts`
  (without the variables it runs in `pnpm test` on the draft-only build)
- Contrast: `node scripts/audit-contrast.ts`

## 1. Lighthouse (mobile)

Lighthouse 13.6, default mobile settings (simulated slow 4G, 4× CPU,
412 px). Each page was audited three times; the table shows the run with
the median LCP, and all three LCPs. "Load time" is LCP.

Headless Chromium reports a software GPU (SwiftShader), so the 3D garden
keeps its poster image; the scores measure the page with the poster (see
STATUS.md, Phase 4).

| Page                          | Locale | Performance | Accessibility | Best practices | SEO | LCP (median of 3) | 3 runs (ms)      | CLS    |
| ----------------------------- | ------ | ----------- | ------------- | -------------- | --- | ----------------- | ---------------- | ------ |
| Home                          | FR     | 100         | 100           | 100            | 100 | 1.51 s            | 1512, 1515, 1524 | 0.0000 |
| Home                          | AR     | 100         | 100           | 100            | 100 | 1.82 s            | 1811, 1816, 1817 | 0.0001 |
| Services                      | FR     | 100         | 100           | 100            | 100 | 0.91 s            | 908, 908, 915    | 0.0000 |
| Services                      | AR     | 100         | 100           | 100            | 100 | 0.91 s            | 907, 907, 1360   | 0.0002 |
| Réalisations                  | FR     | 100         | 100           | 100            | 100 | 1.21 s            | 1212, 1213, 1217 | 0.0000 |
| Réalisations                  | AR     | 100         | 100           | 100            | 100 | 1.36 s            | 1358, 1364, 1364 | 0.0000 |
| Project story (exemple-villa) | FR     | 100         | 100           | 100            | 100 | 1.29 s            | 1062, 1286, 1287 | 0.0000 |
| Project story (exemple-villa) | AR     | 100         | 100           | 100            | 100 | 1.59 s            | 1587, 1589, 1590 | 0.0000 |
| Contact                       | FR     | 100         | 100           | 100            | 100 | 1.07 s            | 1063, 1066, 1372 | 0.0000 |
| Contact                       | AR     | 100         | 100           | 100            | 100 | 1.06 s            | 1057, 1057, 1958 | 0.0000 |
| Mentions légales              | FR     | 100         | 100           | 100            | 100 | 0.91 s            | 910, 911, 912    | 0.0000 |
| Mentions légales              | AR     | 100         | 100           | 100            | 100 | 0.91 s            | 908, 909, 1359   | 0.0004 |
| Confidentialité               | FR     | 100         | 100           | 100            | 100 | 0.91 s            | 907, 908, 909    | 0.0000 |
| Confidentialité               | AR     | 100         | 100           | 100            | 100 | 0.91 s            | 905, 909, 1357   | 0.0005 |
| 404                           | FR     | 100         | 100           | 100            | 100 | 0.91 s            | 909, 910, 1212   | 0.0000 |

The 404 is audited through `/404.html` (the same page), because Lighthouse
refuses to audit a 404 response.

### `/ar/` load time

| Build    | Median LCP | Runs             |
| -------- | ---------- | ---------------- |
| Phase 6b | 2.27 s     | 2.26, 2.27, 2.27 |
| Phase 7  | 1.82 s     | 1.81, 1.82, 1.82 |

Cause: the LCP element is the garden poster on both `/fr/` and `/ar/`. On
`/ar/` six IBM Plex Sans Arabic files (≈ 96 KB) started before it painted
and shared the simulated 4G bandwidth with it. `/fr/` uses the system font.
Fixes:

1. Inline logos use path data rounded to one decimal (`src/assets/brand/`,
   from `public/brand/` with SVGO). Renders are identical at 4× (mean pixel
   difference 0.05 of 255). Home HTML: 44 KB → 22 KB gzipped, both locales
   (`/fr/` 1.66 s → 1.52 s).
2. Spaces, dashes and general punctuation moved from the Latin subset of
   IBM Plex Sans Arabic into the Arabic one (built from both files merged).
   All-Arabic text no longer downloads a Latin file per weight: `/ar/` now
   loads 5 font files instead of 6, and none at weight 500 Latin.

### 404 SEO score

The 404 scored 63 for SEO because it carried `noindex`. Its 404 status
already keeps it out of the index, so the tag was removed; the page still
has no canonical or `hreflang` links. The thank-you page keeps `noindex`.

## 2. axe (Playwright, `@axe-core/playwright` 4.11)

Rules: WCAG 2.0/2.1/2.2 A and AA, plus best practice. Every public page in
FR, AR and EN, the 404, the thank-you page, the open mobile menu (FR, AR)
and the open lightbox (FR, AR). `tests/a11y.spec.ts` fails on any serious
or critical issue.

**Result: 0 violations of any impact on all 29 page states.**

| Page / state                  | Rules passed | Violations (any impact) | Needs review (axe could not decide)                      |
| ----------------------------- | ------------ | ----------------------- | -------------------------------------------------------- |
| ar-confidentialite            | 34           | 0                       | —                                                        |
| ar-contact                    | 43           | 0                       | —                                                        |
| ar-contact/merci              | 34           | 0                       | —                                                        |
| ar-home                       | 46           | 0                       | —                                                        |
| ar-lightbox-open              | 19           | 0                       | —                                                        |
| ar-mentions-legales           | 34           | 0                       | —                                                        |
| ar-menu-open                  | 36           | 0                       | —                                                        |
| ar-realisations               | 43           | 0                       | —                                                        |
| ar-realisations/exemple-villa | 46           | 0                       | —                                                        |
| ar-services                   | 34           | 0                       | —                                                        |
| en-confidentialite            | 34           | 0                       | —                                                        |
| en-contact                    | 43           | 0                       | —                                                        |
| en-contact/merci              | 34           | 0                       | —                                                        |
| en-home                       | 46           | 0                       | color-contrast: #etapes-title                            |
| en-mentions-legales           | 34           | 0                       | —                                                        |
| en-realisations               | 43           | 0                       | —                                                        |
| en-realisations/exemple-villa | 46           | 0                       | color-contrast: .start, .end                             |
| en-services                   | 34           | 0                       | —                                                        |
| fr-404                        | 34           | 0                       | —                                                        |
| fr-confidentialite            | 34           | 0                       | —                                                        |
| fr-contact                    | 43           | 0                       | —                                                        |
| fr-contact/merci              | 34           | 0                       | —                                                        |
| fr-home                       | 46           | 0                       | color-contrast: #etapes-title                            |
| fr-lightbox-open              | 19           | 0                       | color-contrast: figure[aria-hidden="false"] > figcaption |
| fr-mentions-legales           | 34           | 0                       | —                                                        |
| fr-menu-open                  | 36           | 0                       | color-contrast: h1, .page-shell > p                      |
| fr-realisations               | 43           | 0                       | —                                                        |
| fr-realisations/exemple-villa | 46           | 0                       | color-contrast: .start, .end                             |
| fr-services                   | 34           | 0                       | —                                                        |

"Needs review" means axe could not compute contrast (text on a layered or
image background, or covered by the open menu). Each of those elements is
measured in section 3: the steps heading (14.98:1), the before/after labels
(16.68:1) and the captions (≥ 6.46:1). The two items under the open mobile
menu are hidden by the opaque menu panel.

## 3. Contrast

`scripts/audit-contrast.ts` measures every visible text element (929 in
all) on 24 page states in FR and AR: all public pages at 1440 px, home at
390 px, the contact form with every error showing (FR 1440, AR 390), the
open mobile menu, the open lightbox, an open plan hotspot, the 404 and the
thank-you page.

- **solid**: background colours under the text composited until opaque.
- **pixels**: the text is hidden, the element screenshotted, and every
  pixel taken as a possible background; the 5th-percentile worst ratio is
  shown. Used for text over images, translucent layers, opacity and
  disabled controls.
- **header-scroll**: text in the translucent sticky header, sampled at
  five scroll positions over the real content beneath it.
- Placeholders are measured from `::placeholder` on the field background.
- Thresholds: 4.5:1, or 3:1 for large text (≥ 24 px, or ≥ 18.66 px bold).
  Disabled controls are exempt under WCAG 1.4.3 and listed for reference.

**Result: 0 failures.** One row per distinct colour pair and size class,
lowest ratio first:

| Text                  | Background | Size   | Ratio | Needs | Result            | Measured by   | Example (page)                                                                 |
| --------------------- | ---------- | ------ | ----- | ----- | ----------------- | ------------- | ------------------------------------------------------------------------------ |
| `#929693`             | `#f6f7f6`  | normal | 2.79  | 4.5   | exempt (disabled) | pixels        | button.previous “Photo précédente” (/fr/ lightbox open; 1 elements)            |
| `#8b693a`             | `#ffffff`  | normal | 5.02  | 4.5   | pass              | solid         | span.n “Étape 1” (/fr/; 16 elements)                                           |
| `#56615a`             | `#e7edea`  | normal | 5.44  | 4.5   | pass              | header-scroll | a “Comment ça marche” (/fr/contact/; 1 elements)                               |
| `#56615a`             | `#edf2f0`  | normal | 5.71  | 4.5   | pass              | header-scroll | a “خدماتنا” (/ar/contact/; 1 elements)                                         |
| `#56615a`             | `#eff3f1`  | normal | 5.77  | 4.5   | pass              | header-scroll | a “Réalisations” (/fr/contact/; 1 elements)                                    |
| `#56615a`             | `#f2f3f0`  | normal | 5.80  | 4.5   | pass              | solid         | a “ع” (/fr/; 98 elements)                                                      |
| `#56615a` placeholder | `#f2f3f0`  | normal | 5.80  | 4.5   | pass              | solid         | textarea. “Surface, ville, ce que vous aime” (/fr/contact/; 2 elements)        |
| `#56615a`             | `#f4f5f4`  | normal | 5.91  | 4.5   | pass              | header-scroll | a “Comment ça marche” (/fr/; 1 elements)                                       |
| `#56615a`             | `#f5f6f5`  | normal | 5.96  | 4.5   | pass              | header-scroll | a “Services” (/fr/; 1 elements)                                                |
| `#56615a`             | `#f9faf8`  | normal | 6.17  | 4.5   | exempt (disabled) | pixels        | button “Terrain actuel” (/fr/ (390); 2 elements)                               |
| `#56615a`             | `#f9faf9`  | normal | 6.17  | 4.5   | pass              | header-scroll | a “Comment ça marche” (/fr/contact/ errors; 1 elements)                        |
| `#56615a`             | `#fafaf9`  | normal | 6.18  | 4.5   | pass              | header-scroll | a “خدماتنا” (/ar/realisations/exemple-villa/; 1 elements)                      |
| `#56615a`             | `#fafbf9`  | normal | 6.22  | 4.5   | pass              | header-scroll | a “Comment ça marche” (/fr/realisations/exemple-villa/; 1 elements)            |
| `#56615a`             | `#fbfbfb`  | normal | 6.24  | 4.5   | pass              | header-scroll | a “Réalisations” (/fr/services/; 1 elements)                                   |
| `#56615a`             | `#fbfcfa`  | normal | 6.27  | 4.5   | pass              | header-scroll | a “كيف نعمل” (/ar/realisations/exemple-villa/; 1 elements)                     |
| `#56615a`             | `#fbfcfb`  | normal | 6.28  | 4.5   | pass              | header-scroll | a “Comment ça marche” (/fr/services/; 1 elements)                              |
| `#56615a`             | `#fcfcfb`  | normal | 6.29  | 4.5   | pass              | header-scroll | a “Contact” (/fr/realisations/; 7 elements)                                    |
| `#56615a`             | `#fcfcfc`  | normal | 6.29  | 4.5   | pass              | header-scroll | a “Contact” (/fr/services/; 1 elements)                                        |
| `#56615a`             | `#fcfdfb`  | normal | 6.33  | 4.5   | exempt (disabled) | pixels        | button “Terrain actuel” (/fr/; 2 elements)                                     |
| `#56615a`             | `#fcfdfc`  | normal | 6.33  | 4.5   | pass              | header-scroll | a “Comment ça marche” (/fr/realisations/; 1 elements)                          |
| `#56615a`             | `#fdfdfd`  | normal | 6.35  | 4.5   | pass              | header-scroll | a “Services” (/fr/realisations/; 4 elements)                                   |
| `#56615a`             | `#fdfefd`  | normal | 6.38  | 4.5   | pass              | header-scroll | a “Réalisations” (/fr/; 6 elements)                                            |
| `#56615a`             | `#fefefe`  | normal | 6.40  | 4.5   | pass              | header-scroll | a “Services” (/fr/contact/; 5 elements)                                        |
| `#56615a`             | `#ffffff`  | normal | 6.46  | 4.5   | pass              | solid         | p “Nous dessinons votre jardin en 3” (/fr/; 363 elements)                      |
| `#56615a`             | `#ffffff`  | normal | 6.46  | 4.5   | pass              | header-scroll | a “Services” (/fr/contact/merci/; 26 elements)                                 |
| `#56615a` placeholder | `#ffffff`  | normal | 6.46  | 4.5   | pass              | solid         | textarea. “Surface, ville, ce que vous aime” (/fr/contact/ errors; 2 elements) |
| `#b3261e`             | `#ffffff`  | normal | 6.54  | 4.5   | pass              | solid         | span.err “Indiquez un nom de 2 à 120 carac” (/fr/contact/ errors; 10 elements) |
| `#123d2c`             | `#f2f3f0`  | normal | 10.90 | 4.5   | pass              | solid         | a.link “Ouvrir dans Google Maps” (/fr/; 7 elements)                            |
| `#123d2c`             | `#f4f5f3`  | normal | 11.10 | 4.5   | exempt (disabled) | pixels        | button “Projet Atlazra” (/fr/ (390); 1 elements)                               |
| `#123d2c`             | `#f4f6f4`  | normal | 11.18 | 4.5   | exempt (disabled) | pixels        | button “مشروع أطلزرا” (/ar/; 1 elements)                                       |
| `#123d2c`             | `#f5f7f3`  | normal | 11.26 | 4.5   | exempt (disabled) | pixels        | button “مشروع أطلزرا” (/ar/ (390); 1 elements)                                 |
| `#123d2c`             | `#f6f7f5`  | normal | 11.30 | 4.5   | exempt (disabled) | pixels        | button “Projet Atlazra” (/fr/; 1 elements)                                     |
| `#ffffff`             | `#123d2c`  | normal | 12.14 | 4.5   | pass              | solid         | a.skip “Aller au contenu” (/fr/; 64 elements)                                  |
| `#123d2c`             | `#ffffff`  | normal | 12.14 | 4.5   | pass              | solid         | a.link “Toutes les réalisations” (/fr/; 14 elements)                           |
| `#17201b`             | `#f2f3f0`  | normal | 14.98 | 4.5   | pass              | solid         | a.btn.btn-quiet “Nos services” (/fr/; 67 elements)                             |
| `#17201b`             | `#f2f3f0`  | large  | 14.98 | 3     | pass              | solid         | h2 “Du plan au jardin fini” (/fr/; 12 elements)                                |
| `#17201b`             | `#fafbf9`  | normal | 16.07 | 4.5   | pass              | header-scroll | a “Réalisations” (/fr/realisations/exemple-villa/; 1 elements)                 |
| `#17201b`             | `#fcfcfb`  | normal | 16.25 | 4.5   | pass              | header-scroll | a “Réalisations” (/fr/realisations/; 3 elements)                               |
| `#17201b`             | `#fcfdfd`  | normal | 16.37 | 4.5   | pass              | header-scroll | a “اتصل بنا” (/ar/contact/; 1 elements)                                        |
| `#17201b`             | `#fdfdfd`  | normal | 16.40 | 4.5   | pass              | header-scroll | a “Contact” (/fr/contact/; 2 elements)                                         |
| `#17201b`             | `#fefefe`  | normal | 16.54 | 4.5   | pass              | header-scroll | a “Contact” (/fr/contact/ errors; 1 elements)                                  |
| `#17201b`             | `#ffffff`  | normal | 16.68 | 4.5   | pass              | solid         | a “FR” (/fr/; 126 elements)                                                    |
| `#17201b`             | `#ffffff`  | large  | 16.68 | 3     | pass              | solid         | h1 “L'art des espaces verts” (/fr/; 67 elements)                               |
| `#17201b`             | `#ffffff`  | normal | 16.68 | 4.5   | pass              | header-scroll | a “Services” (/fr/services/; 3 elements)                                       |

Text over project cover photos: the story title sits on an opaque white
panel over the cover, the grid titles sit below their photos, and the
before/after labels have their own white background, so none depend on
photo content. The sticky header is the one place where a future real
photo can pass under text: `--glass-header` went from 72% to 86% white so
`--ink-2` nav text stays ≥ 4.68:1 even over pure black (it would be 3.24:1
at 72%).
