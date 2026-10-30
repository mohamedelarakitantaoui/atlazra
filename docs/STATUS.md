# Atlazra Design — project status

Updated: 2026-10-30. Read this file at the start of every future session, after
`AGENTS.md` and before implementation. Update it at the end of every phase with
what was built, decisions, verification results and open TODOs.

## Approved handoff

- Phase 0 — scaffold and CI: done and approved.
- Phase 1 — design system: done and approved. Tokens and base styles are in
  `src/styles/`; UI components are in `src/components/ui/`; showcases are at
  `/fr/dev/ui/` and `/ar/dev/ui/`.
- Phase 2 — i18n routing and site shell: approved in the original handoff;
  footer correction and completion work below are implemented and locally verified.
  Decisions: FR/AR/EN routes with `prefixDefaultLocale`, an edge middleware
  redirect on `/`, path-preserving language switching, sitemap, header and footer.
- Phase 3 — home page: implemented and locally verified; see completion below.
- Phase 4 — interactive 3D garden model: implemented and locally verified;
  see completion below. Real-device check still pending.

## Phase 2 completion

- Built: localized the Arabic copyright in `src/i18n/ar.json` as
  `© 2026 Atlazra Design · دار نزار، الرباط – سلا`, isolated the Latin brand with
  `<bdi>`, and added Playwright assertions for the exact Arabic text, the brand
  element, its LTR direction and bidi isolation on home/contact at both widths.
- Git initialized. Baseline commit: `95d7c87` (chore: baseline after phase 2
  footer fix). Dependencies, generated output/reports and `.env*` are ignored;
  the empty `.env.example` template is explicitly tracked.
- Translation decision: `fr.json`, `ar.json` and `en.json` are the single source
  for all UI copy, nested under nav, footer, home, contact and pages (including
  the dev showcase). `content.ts` exposes typed `t(lang, key)` lookups. Existing
  text was retained during migration. Plain JSON stays separate from markup.
- A schema intersection requires every locale to contain every key from the
  other locales. An in-memory TypeScript check confirmed that removing nav.menu
  from FR, AR or EN produces a type error. `pnpm build` now runs `astro check`
  before building, and Playwright also compares all three leaf key sets.
- Translation commit: `f957033` (refactor: consolidate typed locale dictionaries).
- Added localized services, realisations, mentions-legales and confidentialite
  shells, each with one translated h1 and intro. Legal copy stays as visible
  `TODO(client)` text in the neutral placeholder style.
- Added `/404.html` with the brand mark and links to all three homepages;
  its language switch also links home. Header services/projects links target
  the new pages; the footer includes address, map and legal links.
- Page/navigation commit: `eac19a3` (feat: complete phase 2 page shells and navigation).
- Extended language-switch coverage to every localized page, retaining query
  strings and hashes. Added page, legal placeholder, 404 and navigation checks.
- Verification: `pnpm lint`, `pnpm check`, `pnpm build` and `pnpm test` passed;
  Astro check reported zero errors/warnings/hints; all 58 Playwright tests passed.
  FR/AR screenshots at 390 px and 1440 px were captured under `test-results/`;
  requested `/fr/services/` and `/ar/realisations/` screenshots at 390 px were
  captured and visually inspected. See `pages-capture-fr-services-390-chromium/`
  and `pages-capture-ar-realisations-390-chromium/` beneath `test-results/`.
- Environment: checks ran with Astro telemetry disabled and elevated tool access
  where needed. JSON import attributes support both Node ESM tests and Astro.
  Build warned that local Node 24 differs from Vercel's selected Node 22 runtime.
  Deployment and Lighthouse were not tested in this completion pass.
- No Phase 3 work was performed. Stop here until its prompt is supplied.

## Phase 3 completion

- Ported the five home sections into `src/pages/[lang]/index.astro` in reference
  order: hero, services, four project steps, réalisations teaser and contact
  teaser. Reused Button, Logo, AccordionRow, Chip and SegmentedControl primitives.
- Kept the reference copy, SVG service/step illustrations, spacing and
  breakpoints. Home copy is in FR/AR/EN JSON under `home.reference`, accessed
  through typed `t()` calls; additional placeholder and accessible control labels
  are localized as well. No tokens were added.
- Services start with the first accordion open. Their heading is sticky above
  860 px and static at/below 860 px. Steps use native scroll snap and momentum,
  mirrored arrows, RTL-aware scrolling and disabled end controls; reduced motion
  uses instant button scrolling.
- The model remains a static 5:4 mist placeholder with the reference radius,
  caption and a disabled segmented control. Added an optional disabled prop to
  the existing primitive. No three.js is loaded; Phase 4 replaces this slot.
- Projects show the four reference project types and the honest photo placeholder.
  Client TODOs remain in locale content; missing contact information renders in
  neutral secondary text. Contact includes the address, supplied Google Maps link
  and CTA to the localized contact page, without the reference demo form.
- Verification: `pnpm lint`, `pnpm check`, `pnpm build` and
  `pnpm test --workers=2` passed. Astro check: zero errors/warnings/hints.
  All 61 Playwright tests passed, including new FR/AR/EN checks for server-rendered
  sections, translated headings, accordion behavior, inert model controls,
  projects/contact, RTL step navigation/end states and 360–1440 px overflow and
  sticky breakpoints. Scroll tests await the snapped position before continuing.
- Captured and visually inspected the full-page home screenshots in
  `test-results/site-home-fr-390-chromium/home-fr-390.png`,
  `test-results/site-home-fr-1440-chromium/home-fr-1440.png`,
  `test-results/site-home-ar-390-chromium/home-ar-390.png` and
  `test-results/site-home-ar-1440-chromium/home-ar-1440.png`.
  Generated screenshots remain ignored by Git.
- Environment: Astro telemetry disabled; build, final check and browser tests
  required elevated tool access because sandboxed esbuild could not read parent
  directories. Build retains the local Node 24 / Vercel Node 22 warning.
  Deployment, Lighthouse and physical-device testing were not performed.
- Stop after Phase 3. Phase 4 has not been started.

## Phase 4 completion

- Built: the `<garden-model>` island in `src/components/garden/`
  (`GardenModel.astro` loader, `scene.ts` three.js scene, `config.ts` plot data)
  replaces the Phase 3 placeholder in the hero. It ports the reference model:
  1:1 pointer drag with pointer capture, release momentum, mirrored arrow keys
  in Arabic (the model itself stays LTR), the "current site / Atlazra project"
  control (a `pressed` mode added to SegmentedControl), the one-time grow-in
  intro, render-on-demand (idle, hidden and disposed scenes draw no frames),
  reduced-motion instant states and full GPU disposal on swap/disconnect.
  Copy for FR/AR/EN is under `garden.*` in the locale JSON.
- three.js is pinned to 0.180.0 to keep the reference's soft shadows.
  `public/garden-poster.webp` (1241 × 993, 28 KB) is the server-rendered
  stand-in, generated by `scripts/render-garden-poster.ts` from the real scene.
- Loading, in order:
  1. The IntersectionObserver (200 px margin) decides *whether* to load.
  2. The start waits for `window` load plus `requestIdleCallback`
     (`setTimeout` 1500 ms where it is missing). The poster shows until then.
  3. Before importing three.js, the loader reads the GPU name
     (`WEBGL_debug_renderer_info`, else `RENDERER`). SwiftShader, llvmpipe,
     "Software" or Microsoft "Basic Render" renderers keep the poster with no
     message and never fetch the scene. No WebGL 2 at all shows the localized
     fallback note over the poster, also without fetching the scene.
  4. Frame-time guard: the first 10 intro frames are measured; if their median
     is over 40 ms the intro stops, the poster cross-fades back (200 ms), the
     scene is disposed after the fade and one `console.info` line is logged.
     `data-slow-frame-ms` on `<garden-model>` overrides the 40 ms budget; tests
     set it to `Infinity` because headless SwiftShader sits near the limit.
- **Lighthouse no longer measures the 3D cost.** Its headless Chrome reports
  SwiftShader, so it gets the poster (`sceneLoaded: false` in the summary). The
  scores below are for the page with the poster. The frame-time guard is the
  protection for weak real GPUs. **A check on a real mid-range phone (drag
  smoothness, intro, whether the guard fires) is still pending.**
- Bronze contrast: `--bronze` `#9a7440` → `#8b693a` (minimal HSL-lightness
  change, same hue and saturation). Step labels at 0.8rem: 3.81 → 4.51:1 on
  mist, 4.25 → 5.02:1 on white. AGENTS.md table updated with the reason;
  `reference/index.html` keeps the old value.
- Verification (2026-10-30, local Node 24):
  - `pnpm lint`, `pnpm check` (0 errors/warnings/hints), `pnpm build` passed.
  - `pnpm test`: all 72 Playwright tests passed on the dev server. Garden and
    home specs also passed twice against the production build (`PW_BUILT=1`;
    the static server has no middleware, so the redirect/404 specs need dev).
    New tests: a mocked SwiftShader renderer keeps the poster and requests no
    scene/three chunk; 60 ms rAF delays trip the guard (poster back, scene
    disposed, one `console.info`); the scene chunk starts after `loadEventEnd`.
  - Bundle (`scripts/garden-bundle.ts`, all emitted JS): 124,993 bytes gzip,
    of which `scene` 123,186 and the loader 1,807; limit 200 KB.
  - Lighthouse 13.6 mobile (`scripts/audit-garden.ts`, production build):
    | Page | Perf | A11y | Best pr. | SEO | LCP | TBT | CLS |
    |---|---|---|---|---|---|---|---|
    | `/fr/` | 99 | 100 | 100 | 100 | 1.97 s | 2 ms | 0 |
    | `/ar/` | 96 | 100 | 100 | 100 | 2.73 s | 0 ms | 0.045 |
    Before these changes `/fr/` scored 69 (TBT 8.8 s from software-rendered
    intro frames). The `/ar/` LCP is over the 2.5 s budget: the LCP element is
    the poster; under simulated slow 4G it shares bandwidth with the IBM Plex
    Sans Arabic files (45 KB + 20 KB), and the CLS is the hero shifting when
    that font swaps in. This predates Phase 4 and is left open below.
  - Drag trace (390 px, DPR 2, 4× CPU throttle, scene forced on SwiftShader):
    median frame 16.7 ms, p95 100 ms, 37 frames over 50 ms, no console errors.
    Software rasterization makes this a pessimistic bound, not a device result.
  - FR/AR screenshots at 390 and 1440 px in both model states were captured by
    the `capture garden` tests (`test-results/garden-capture-*`, ignored by
    Git). After the loading and bronze changes, `fr-390-project` and
    `ar-1440-current` were re-inspected: model fits its slot, RTL layout intact,
    step labels in the new bronze.
- Environment: `.git` is owned by the Codex sandbox Windows user; git commands
  from the normal account need `-c safe.directory=C:/Users/11/Desktop/atlazra-site`
  (or a global exception). Build retains the Node 24 / Vercel Node 22 warning.
- Stop after Phase 4.

## Open TODOs

- Client: phone/WhatsApp, email, opening hours, address label confirmation
  (Dar Nizar versus the Top Dar Fleur map pin), confirmed services, real project
  photos and 3D renders, domain and lead recipient email.
- Real-device check of the 3D model on a mid-range Android phone and an iPhone.
- `/ar/` LCP 2.73 s (budget 2.5 s) and CLS 0.045 from Arabic font loading;
  needs a font-loading decision (subset, preload or `size-adjust` fallback).
- Phase 5 remains gated on the user's next prompt.
