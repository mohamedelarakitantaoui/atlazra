# Atlazra Design — project status

Updated: 2026-10-28. Read this file at the start of every future session, after
`AGENTS.md` and before implementation. Update it at the end of every phase with
what was built, decisions, verification results and open TODOs.

## Approved handoff

- Phase 0 — scaffold and CI: done and approved.
- Phase 1 — design system: done and approved. Tokens and base styles are in
  `src/styles/`; UI components are in `src/components/ui/`; showcases are at
  `/fr/dev/ui/` and `/ar/dev/ui/`.
- Phase 2 — i18n routing and site shell: done and approved per the handoff,
  with one open Arabic footer bidi fix at the start of this session.
  Decisions: FR/AR/EN routes with `prefixDefaultLocale`, an edge middleware
  redirect on `/`, path-preserving language switching, sitemap, header and footer.
- Phase 3 — not started. Wait for the user to paste its prompt.

## Local checkout observations

The supplied handoff is recorded above; it is not a fresh audit of all prior
acceptance criteria. This folder has no Git repository metadata. The current
source uses `src/i18n/content.ts`, and only home, contact and dev UI localized
pages are present. The remaining Phase 2 shell pages described in `PROMPTS.md`
are absent. Do not silently expand this footer task to recreate them.

## Phase 2 follow-up

- Built: localized the Arabic copyright in `src/i18n/ar.json` as
  `© 2026 Atlazra Design · دار نزار، الرباط – سلا`, isolate the Latin brand with
  `<bdi>`, and added Playwright assertions for the exact Arabic text, the brand
  element, its LTR direction and bidi isolation on home/contact at both widths.
- Decision: keep translated text as plain JSON and render `<bdi>` in the footer;
  preserve existing French and English copyright behavior.
- Verification: `pnpm lint`, `pnpm check`, `pnpm build` and `pnpm test` passed;
  Astro check reported zero errors/warnings/hints; all 30 Playwright tests passed.
  FR/AR screenshots at 390 px and 1440 px were captured under `test-results/`;
  both Arabic home screenshots were visually inspected.
- Environment: Astro telemetry was disabled for these checks. Check/build
  initially encountered sandbox dependency access errors and passed with elevated
  tool access. Build warned that local Node 24 differs from the selected Vercel
  Node 22 runtime; deployment was not tested.
- The Arabic footer follow-up is complete. No Phase 3 work was performed.

## Open TODOs

- Resolve the difference between the approved Phase 2 handoff and this local
  folder before relying on the missing pages in a future phase.
- Client: phone/WhatsApp, email, opening hours, address label confirmation
  (Dar Nizar versus the Top Dar Fleur map pin), confirmed services, real project
  photos and 3D renders, domain and lead recipient email.
- Phase 3 remains gated on the user's next prompt.
