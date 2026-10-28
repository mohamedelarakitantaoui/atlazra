# Atlazra Design — project status

Updated: 2026-10-28. Read this file at the start of every future session, after
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
- Phase 3 — not started. Wait for the user to paste its prompt.

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

## Open TODOs

- Client: phone/WhatsApp, email, opening hours, address label confirmation
  (Dar Nizar versus the Top Dar Fleur map pin), confirmed services, real project
  photos and 3D renders, domain and lead recipient email.
- Phase 3 remains gated on the user's next prompt.
