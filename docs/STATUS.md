# Atlazra Design — project status

Updated: 2026-11-02. Read this file at the start of every future session, after
`AGENTS.md` and before implementation. Update it at the end of every phase with
what was built, decisions, verification results and open TODOs.

## Approved handoff

- Phase 0 — scaffold and CI: done and approved.
- Phase 1 — design system: done and approved. Tokens and base styles are in
  `src/styles/`; UI components are in `src/components/ui/`; showcases are at
  `/fr/dev/ui/` and `/ar/dev/ui/`.
- Phase 2 — i18n routing and site shell: approved in the original handoff;
  footer correction and completion work below are implemented and locally verified.
  Decisions: FR/AR/EN routes with `prefixDefaultLocale`, a middleware
  redirect on `/` (Edge until Phase 5, now in the Node function),
  path-preserving language switching, sitemap, header and footer.
- Phase 3 — home page: implemented and locally verified; see completion below.
- Phase 4 — interactive 3D garden model: implemented and locally verified;
  see completion below. Real-device check still pending.
- Phase 5 — contact form (database plan removed): implemented and locally
  verified; see completion below.
- Phase 6 — réalisations from content collections: implemented and locally
  verified; see completion below.

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
  The poster (`public/garden-poster-{640,960,1440,2160}.webp`) is the
  server-rendered stand-in, generated by `scripts/render-garden-poster.ts` from
  the real scene; see the follow-up below.
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
- `data-slow-frame-ms` on `<garden-model>` is a **test-only hook**: it
  overrides the 40 ms frame budget. Pages never render it. Playwright sets it
  to `Infinity` (`disableFrameGuard` in `tests/renderer.ts`), as do the audit
  and poster scripts, because headless SwiftShader intro frames sit near the
  limit and the guard would fire at random. Don't use it in production markup.
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
    that font swaps in. This predated Phase 4; fixed in the follow-up below.
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

## Phase 4 follow-up: poster and Arabic font loading

- Responsive poster: the script renders the scene once at 2160 × 1728 (a
  1080 px slot at DPR 2) and downscales in the browser to 640/960/1440/2160 px
  WebP (q 0.8). The single `garden-poster.webp` is removed. The `<img>` uses
  `srcset` + `sizes` from `src/components/garden/poster.ts`, which match the
  slot: `100vw − 40px` up to 920 px, `56vw − 23px` to 1160 px,
  `653px − 2.33vw` to 1400 px, then 621 px. It keeps `width`/`height`
  (2160 × 1728), `fetchpriority="high"`, `decoding="async"`, no lazy loading.
- Arabic font: `scripts/subset-arabic-font.py` (fonttools + brotli, run by
  hand; outputs committed in `src/assets/fonts/`) subsets the Fontsource files
  for 400/500/600. Arabic file: ، ؛ ؟, letters, tatweel, harakat
  (U+060C, U+061B, U+061F, U+0621–0652). Latin file: Basic Latin, Latin-1,
  bidi marks, general punctuation. `src/styles/fonts.css` replaces the
  Fontsource imports with matching `unicode-range`s and `font-display: swap`.
  `SiteLayout` preloads only the 600 Arabic file (the h1 weight) on Arabic
  pages; it is the same hashed file the CSS uses.
- Size-matched fallbacks in `fonts.css`: `IBM Plex Sans Arabic Fallback`
  (local Tahoma / Tahoma Bold) and `… Fallback Arial`, placed after Plex in
  `--font-ar`. Tahoma 400/500 90% and 600 84%; Arial 117% / 118.5%. Ascent and
  descent overrides are Plex's 1.085/0.415 em divided by size-adjust, line gap
  0. Tuned in Chromium so the hero h1, paragraph and model caption wrap the
  same in both fonts. The h1 fits its 390 px column by 0.4 px and the caption
  overflows by 0.8 px, so these values are tight. Re-measure if hero copy
  changes. The Arial values were measured on the strings but not verified
  in-page, because Tahoma wins on Windows. Systems with neither font (Linux,
  Android) fall through to the untuned stack.
  The Latin site font is the system stack (no web font), so it cannot shift.
- New `tests/fonts.spec.ts`: preload only on Arabic pages; the Arabic hero
  (h1, paragraph, actions, model) keeps its top and height within 2 px between
  fonts-blocked and Plex loads at 390 and 1440 px. It skips where Tahoma/Arial
  are missing. The garden test now checks that the chosen poster file is at
  least slot width × DPR.
- File sizes (bytes):
  | File | Before | After |
  |---|---|---|
  | Poster | 28,164 (one 1241 w) | 11,372 / 18,338 / 30,392 / 53,426 (640/960/1440/2160 w) |
  | Plex Arabic 400 / 500 / 600 | 42,848 / 45,296 / 45,688 | 14,220 / 14,500 / 14,812 |
  | Plex Latin 400 / 500 / 600 | 19,164 / 20,088 / 20,500 | 17,540 / 18,364 / 18,652 |
  Lighthouse's 412 px mobile run fetches the 960 w poster (18.6 KB transfer).
- Verification (2026-10-30): lint, check (0/0/0), build passed; `pnpm test`
  75/75 on the dev server; fonts, garden and home specs 17/17 on the
  production build; JS bundle unchanged at 124,993 bytes gzip.
  Lighthouse 13.6 mobile, production build:
  | Page | Perf | A11y | BP | SEO | LCP | TBT | CLS |
  |---|---|---|---|---|---|---|---|
  | `/fr/` before | 99 | 100 | 100 | 100 | 1.97 s | 2 ms | 0 |
  | `/fr/` after | 100 | 100 | 100 | 100 | 1.67 s | 0 ms | 0 |
  | `/ar/` before | 96 | 100 | 100 | 100 | 2.73 s | 0 ms | 0.045 |
  | `/ar/` after | 99 | 100 | 100 | 100 | 2.12 s | 0 ms | 0.0001 |
  Lighthouse still gets the poster, not the 3D scene (see above).
- Noticed, not changed: French and English pages download the Plex 600 Arabic
  and Latin files only for the "ع" language-switch label.

## Phase 5 completion: contact form, database plan removed

- Stack change (decided 2026-10-30, recorded in `AGENTS.md` and `PROMPTS.md`):
  the site is a showcase. No Supabase, database, admin panel or rate-limit
  store. Projects will be Astro content collections; contact details live in
  `src/data/site.ts`; leads go by email only, through Resend. `.env.example`
  now lists `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`,
  `CONTACT_SIGNING_SECRET` and `SITE_URL`.
- Built:
  - `/[lang]/contact/` is rendered per request so the form carries a fresh
    HMAC-signed timestamp (`src/lib/contact/security.ts`); it also works
    without JavaScript (native POST, 303 to `/[lang]/contact/merci/` or back
    with field-error ids and `failed=1`; no personal data in redirect URLs).
  - `POST /api/contact/` (`src/lib/contact/server.ts`): body capped at 64 KB,
    Origin check, honeypot, minimum fill time, shared zod schema
    (`schema.ts`, also used for blur validation in the island), localized
    errors, Resend call with an idempotency key and a 10 s timeout.
  - `ContactForm` island: blur validation, loading/success/failure states,
    focus management, retry. WhatsApp links and the failure fallback stay
    hidden while the number is `TODO(client)`.
  - `ContactDetails`, footer details, `Field` error wiring; `Button` fixed to
    render a single `type` attribute (it rendered both `button` and `submit`).
  - Sitemap keeps the three contact URLs (now on-demand) and excludes the
    thank-you pages. Language-switch "ع" uses a system Arabic font, so FR/EN
    pages request no Arabic web fonts.
  - Build bundles zod into the function (`ssr.noExternal`): Vercel's packager
    otherwise copies pnpm symlinks, which Windows can't create without
    Developer Mode.
- Production fixes found while moving tests to the production build:
  - `edgeMiddleware: true` removed. `@astrojs/vercel` 8.2.11's Edge wrapper
    forwards only headers to the Node function, so on Vercel a contact POST
    would have arrived as a bodiless GET. Middleware now runs in `_render`;
    `/` still negotiates `Accept-Language`. A build test asserts `/` and
    `/api/contact/` route to `_render` and no `_middleware` exists.
  - `security.allowedDomains` added. Without it Astro 5.18 rebuilds every
    request URL as `localhost`, and its `checkOrigin` returned 403 for every
    form POST. Allowed: the `SITE_URL` host and `www.`, `**.vercel.app`
    (https), and `127.0.0.1` / `localhost` (http, for the local production
    server; Vercel never routes those hosts). Checked by hand: a valid POST
    gets 303; a cross-site Origin or spoofed Host gets 403. If the final
    domain differs from `atlazra.ma`, set `SITE_URL` at build time or form
    POSTs will be rejected.
- Tests now run on the production build:
  - Why: the Vite dev server stalled a module fetch for exactly 60 s at
    random points (first request, then again mid-run) and rendered an error
    overlay, failing random tests. Warm-up requests, fewer workers, separate
    caches and `optimizeDeps.include` made it rarer but never removed it.
    Those workarounds and the second dev server are deleted.
  - `pnpm build` then `pnpm test`. Playwright starts `tests/serve.ts`, which
    uses `scripts/serve-built.ts` (now following `.vercel/output/config.json`:
    308 slash redirects, static files, `_render`, 404 page) and mocks Resend
    in-process with `/__test/emails`. The garden spec runs as its own serial
    project after the rest (SwiftShader timing is unreliable under load).
  - WhatsApp-with-a-number can't be shown by the production build while the
    number is a TODO, so the browser tests cover the pending state (failure
    and retry with no WhatsApp link, with and without JavaScript) and a unit
    test covers the `wa.me` link format once a number is set.
  - The success test holds the request with `page.route` to observe the
    loading label instead of relying on a 250 ms mock delay.
- Verification (2026-11-02, local Node 24):
  - `pnpm lint`; `pnpm check` 0 errors/warnings/hints; `pnpm build` passed.
  - `pnpm test` three consecutive runs, all green: 48/48 unit, 98/98
    Playwright (87 + 11 garden) each run, 1.5–1.7 min.
  - Lighthouse 13.6 mobile (`scripts/audit-contact.ts`, production build):
    | Page | Perf | A11y | BP | SEO | LCP | TBT | CLS |
    |---|---|---|---|---|---|---|---|
    | `/fr/contact/` | 100 | 100 | 100 | 100 | 1.23 s | 0 ms | 0 |
    | `/ar/contact/` | 100 | 100 | 100 | 100 | 1.22 s | 0 ms | 0.0001 |
  - Screenshots FR/AR/EN at 390 and 1440 px reviewed (RTL mirrored, no
    horizontal scroll).
- Not verified: a real Resend send and the Vercel deployment (no keys or
  project yet).

## Phase 6 completion: réalisations from content collections

- Built:
  - `projects` content collection (`src/content.config.ts`): one folder per
    project in `src/content/projects/<slug>/` with `index.md` and its photos.
    Frontmatter (JSON, also valid YAML) holds status, type, city, optional
    surface, year, sort order, FR/AR/EN title/summary, cover, images (`kind`:
    `before`, `render_3d`, `plan`, `photo`, `after`; localized alt required)
    and optional plan hotspots. The cover must appear in `images`; hotspots
    require a plan image. The story body has `## fr|ar|en` sections with
    chapter keys (`### before`, `### design`, …) parsed by
    `src/lib/project-story.ts`.
  - `src/lib/project-loader.ts` drops non-`published` entries inside the
    loader, so drafts get no page, no sitemap entry and no image assets.
    `_*` folders are ignored; on CI/Vercel `exemple-*` folders are excluded
    too, even if someone publishes them by mistake.
  - `/[lang]/realisations/` grid and `/[lang]/realisations/<slug>/` story
    (`src/components/projects/`): image-kind chapters, before/after slider,
    plan hotspots, album with lightbox (keyboard, RTL-mirrored controls,
    reduced motion, plain links without JavaScript). The home teaser shows
    published projects. Empty states stay honest placeholders.
  - Images are prerendered by Astro/Sharp (AVIF + WebP, explicit sizes, lazy
    below the fold). Sharp is a direct dependency; the production image
    endpoint is replaced by a 404 stub (`src/lib/static-image-endpoint.ts`)
    so Vercel's Windows packager doesn't try to copy Sharp into the contact
    function. Project pages preload the Arabic font (CLS 0).
  - Two flat placeholder examples (`exemple-villa`, `exemple-terrasse`) and a
    `_template` folder, all `draft`. Editor guide: `docs/adding-a-project.md`.
- Scripts: `scripts/verify-project-examples.mjs` (local only) temporarily
  publishes both examples, builds, runs `tests/projects.spec.ts` with
  `PROJECT_EXAMPLES=1`, runs the Lighthouse audit, builds again with `CI=1`
  and asserts no `exemple-*` routes or images leak, then restores the drafts
  and rebuilds. `scripts/audit-projects.ts [--draft]` writes screenshots and
  Lighthouse reports to `artifacts/phase-6/` (ignored by Git).
- Verification (2026-11-02, local Node 24):
  - `pnpm lint`; `pnpm check` 0 errors/warnings/hints; `pnpm build` passed.
    The build logs "collection projects … is empty" because every project is
    a draft; this is expected.
  - `pnpm test` on the draft-only build: 50/50 unit, 102 Playwright passed,
    4 skipped (populated-page tests, which only run with `PROJECT_EXAMPLES=1`).
    The examples build passed those tests in FR/AR/EN, including RTL controls
    and no-JavaScript album links.
  - Lighthouse 13.6 mobile:
    | Build | Page | Perf | A11y | BP | SEO | LCP | CLS |
    |---|---|---|---|---|---|---|---|
    | examples | `/fr/realisations/` | 100 | 100 | 100 | 100 | 1.36 s | 0 |
    | examples | `/fr/realisations/exemple-villa/` | 100 | 100 | 100 | 100 | 1.28 s | 0 |
    | examples | `/ar/realisations/` | 100 | 100 | 100 | 100 | 1.51 s | 0 |
    | examples | `/ar/realisations/exemple-villa/` | 100 | 100 | 100 | 100 | 1.59 s | 0 |
    | drafts only | `/fr/realisations/` | 100 | 100 | 100 | 100 | 0.91 s | 0 |
    | drafts only | `/ar/realisations/` | 100 | 100 | 100 | 100 | 0.92 s | 0 |
  - FR/AR grid and story screenshots at 390 and 1440 px (examples) and
    home/grid (drafts only) captured in `artifacts/phase-6/` and reviewed.
- Before launch: delete both `exemple-*` folders once real projects exist.

## Open TODOs

- Client: phone/WhatsApp, email, opening hours, address label confirmation
  (Dar Nizar versus the Top Dar Fleur map pin), confirmed services, real project
  photos and 3D renders, domain and lead recipient email.
- Real-device check of the 3D model on a mid-range Android phone and an iPhone.
- Before launch: Resend account with a verified sending domain, the four
  contact env vars and `SITE_URL` on Vercel, then a live test submission.
- Real project content: replace the `exemple-*` folders with published
  client projects (photos, 3D renders, plans, confirmed facts).
- Phase 7 is gated on the user's next prompt.
