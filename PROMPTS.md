# Atlazra Design — build prompts for Codex / Claude Code

Run the phases **in order**, one prompt per agent session. Each prompt is self-contained: paste it as is.
After each phase: review the diff, run the site, commit. Don't start a phase until the previous one passes its checks.

**Who does what (suggested)**
- **Claude Code**: phases with design judgment and multi-file refactors (1, 2, 3, 4, 6).
- **Codex**: well-specified backend and test work (5, 7, 8). Either agent can do any phase.
- Use git worktrees if you run two agents in parallel (e.g. phase 5 + phase 3). Never let two agents edit the same files.

## Architecture at a glance

The site is a **showcase**: it presents the company's work. Visitors upload or host nothing.
No database, no admin panel, no Docker. (Decided 2026-10-30, replacing the earlier Supabase plan.)

```
Browser ── Astro pages (static, FR/AR/EN) ── islands: 3D model · contact form
                     │
                     ├── src/content/projects/*.md + photos  (projects, added by the developer, git push → rebuild)
                     ├── src/data/site.ts                      (phone, WhatsApp, email, hours, Instagram)
                     └── /api/contact (Vercel function) ── zod ── Resend email to Atlazra
```

| Layer | Choice | Why |
|---|---|---|
| Frontend | Astro 5, TypeScript, plain CSS tokens | Fast static pages, built-in i18n, islands only where needed |
| 3D | three.js (lazy island) | The signature: the client sees the garden before work |
| Content | Astro content collections (Markdown + images in the repo) | Projects are files; no database to run or pay for |
| Email | Resend | Contact form → email to Atlazra |
| Hosting | Vercel | Astro adapter, preview deploys per branch, one serverless function |

---

## Phase 0 — Repository and tooling

```text
Read AGENTS.md first.

Create a new Astro 5 project in this repo with TypeScript strict, pnpm, and the @astrojs/vercel adapter (output: "static" with per-route server endpoints allowed, i.e. hybrid behavior via `export const prerender = false` on API routes).

Set up:
- ESLint (typescript + astro plugins) and Prettier, with `pnpm lint` and `pnpm format`.
- `pnpm check` running `astro check`.
- Playwright with a `pnpm test` script and one smoke test that loads `/fr/` and checks the h1 text "L'art des espaces verts".
- `.env.example` listing: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, LEADS_TO_EMAIL, LEADS_FROM_EMAIL, VERCEL_DEPLOY_HOOK_URL, ADMIN_EMAILS.
- Move `reference/index.html` untouched into `reference/` (it is the design reference, not served).
- Copy the SVGs from `assets/brand/` into `public/brand/`.
- A GitHub Actions workflow that runs lint, check, build and test on every PR.

Acceptance: `pnpm lint && pnpm check && pnpm build && pnpm test` all pass. Show me the folder tree.
```

## Phase 1 — Design system

```text
Read AGENTS.md and open reference/index.html. Port its design system into the Astro project. Do not invent a new style.

Create:
- src/styles/tokens.css: every color, radius, easing and font token from the reference `:root`, plus a spacing scale (4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px as rem).
- src/styles/base.css: reset, body, headings with size-specific tracking, focus ring, reduced-motion and reduced-transparency rules, RTL font switch on `html[dir=rtl]`.
- Components in src/components/ui/: Logo.astro (variants: full | mark | wordmark, inline SVG with currentColor), Button.astro (primary | quiet, renders <a> or <button>, :active scale .97), SegmentedControl (accessible, aria-pressed, sliding thumb), Accordion row (the services row with the +/− icon, grid-template-rows 0fr→1fr), Chip, Field (label + input/textarea + inline error).
- A /dev/ui page (not in sitemap, noindex) showing every component in FR and AR.

Rules: logical CSS properties only (inline-start/end), no `transition: all`, no ease-in, no new colors.
Acceptance: /dev/ui matches the reference visually at 390 px and 1440 px (Playwright screenshots attached to your reply).
```

## Phase 2 — Layout, navigation and i18n

```text
Read AGENTS.md. Build the site shell with Astro's i18n routing.

- Locales: fr (default), ar, en. Routes: /fr/, /ar/, /en/ ; `/` redirects to /fr/ (or to the browser language if ar/en).
- `<html lang dir>` set per locale; Arabic is dir="rtl".
- src/i18n/{fr,ar,en}.json holding every UI string. Take the copy from the dictionaries in reference/index.html. No hard-coded strings in components.
- BaseLayout.astro: <head> with title template "Page — Atlazra Design", meta description, canonical, hreflang alternates for the 3 locales + x-default, Open Graph and Twitter tags, favicon from the mark SVG.
- Header: translucent sticky bar, wordmark, nav (Services, Comment ça marche, Réalisations, Contact), language switch that keeps the current page, primary CTA "Demander une visite". Mobile: menu button, panel closes on link click and on Escape, focus trapped while open.
- Footer: wordmark, tagline, address, Google Maps link, legal links (Mentions légales, Confidentialité), © year.
- Pages as empty shells with h1: home, /services, /realisations, /contact, /mentions-legales, /confidentialite, 404 (uses the mark).

Acceptance: switching language on any page lands on the same page in the other locale; no horizontal scroll at 360 px in AR; Lighthouse accessibility ≥ 95.
```

## Phase 3 — Home page

```text
Read AGENTS.md. Port the home page from reference/index.html section by section into src/pages/[lang]/index.astro using the Phase 1 components and Phase 2 strings.

Sections in order: Hero (mark, h1, paragraph, two buttons, location line, 3D model slot) · Services (sticky heading + accordion rows) · "Comment se passe un projet" (4 steps in a horizontal scroll-snap track with prev/next buttons that respect RTL) · Réalisations teaser (list of project types + up to 3 latest projects once Phase 7 exists; until then the placeholder block) · Contact teaser (address + CTA to /contact).

For now put a static placeholder (same size, --mist background, caption) where the 3D model goes; Phase 4 fills it.
Keep the exact copy, spacing and order. Content that the client hasn't provided stays as TODO(client) in the i18n files and renders as the neutral "à compléter" style.

Acceptance: side-by-side screenshots (reference vs Astro) at 390 and 1440 px, FR and AR, look the same.
```

## Phase 4 — The 3D garden model (signature)

```text
Read AGENTS.md, especially "Motion and interaction". Port the 3D model from the <script> in reference/index.html into a reusable island.

- src/components/garden/GardenModel.astro (container, segmented control "Terrain actuel / Projet Atlazra", hint, caption) + src/components/garden/scene.ts (three.js scene).
- Install three (pinned version) from npm. Load the module with a dynamic import when the container enters the viewport (IntersectionObserver), not on page load.
- Keep the behavior: drag to rotate with pointer capture and 1:1 tracking, release velocity → momentum with exponential decay (rate 0.998/ms), interruptible; per-object critically-damped springs (response 0.45 s) with staggered delays when switching state; trees get damping 0.72 only when growing; render on demand (stop the rAF loop when nothing moves); ResizeObserver; DPR capped at 2.
- Before three.js loads, show a static poster image of the model (export one with a script: render the scene once in Playwright and save public/garden-poster.webp).
- Fallback text if WebGL is unavailable. prefers-reduced-motion: no momentum, no springs, instant state change, no intro growth.
- Put the scene definition (plot size, house, trees, pool, path, beds) in a typed config object so future projects can define their own garden.
- Dispose geometries/materials on unmount; pause when the tab is hidden.

Acceptance: 60 fps while dragging on a mid-range Android (check Performance panel, no long tasks > 50 ms after load); JS for the island < 200 KB gzip; Lighthouse performance ≥ 90 on mobile.
```

## Phase 5 — Simplify the stack + contact form

```text
Read AGENTS.md and docs/STATUS.md first. The site is a showcase only: no database, no admin, no Supabase, no Docker. Do this phase only.

Cleanup:
- AGENTS.md: replace the stack line with "Astro 5 + TypeScript (strict), plain CSS tokens, three.js island, Astro content collections for projects, Resend for the contact email, Vercel". Islands are: 3D model and contact form (remove "admin"). Remove Supabase from the secrets rule; keep "secrets only in env vars, never in the browser".
- .env.example: keep only RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL, CONTACT_SIGNING_SECRET.
- src/data/site.ts: a typed object for phone, whatsapp, email, hours (per locale), instagram, address, map URL. Values the client hasn't given stay as TODO(client) and render in the neutral "à compléter" style. The home contact teaser and footer read from it.

Contact form:
- src/pages/api/contact.ts (prerender = false), POST:
  - zod schema: name (2–120), phone (6–30, normalize Moroccan numbers 06…/07…, +212…, 00212… to E.164), email optional, project_type (villa | riad | terrasse | pro | 3d), surface_m2 optional, city optional, message (4–4000), locale (fr | ar | en).
  - Spam: hidden honeypot field + minimum fill time 3 s using an HMAC-signed timestamp (CONTACT_SIGNING_SECRET). No rate-limit store (there's no database); note this in a comment.
  - Send with Resend to CONTACT_TO_EMAIL, subject "Nouvelle demande — {type} — {name}", body with every field, a wa.me/{phone} link and the reply-to set to the visitor's email if given.
  - Responses: 200 {ok:true} | 400 {errors:{field:message}} localized | 502 if Resend fails. On 502 the UI shows the error state with a "Écrire sur WhatsApp" fallback, so the visitor can still reach the company.
- Contact form island on /[lang]/contact: same UI as the reference (chips for project type, inline validation on blur, submit with loading state, success state that replaces the form, error state with retry + WhatsApp). Works without JS as a normal POST (redirect to /{lang}/contact/merci or back with errors).
- "Écrire sur WhatsApp" button with a prefilled localized message from site.ts. Hidden while the number is still TODO(client).

Acceptance: Vitest unit tests for the schema and phone normalization; Playwright tests with Resend mocked: success, field errors, honeypot → 400 and no email sent, Resend failure → 502 + WhatsApp fallback visible; no-JS submit works. lint, check, build, all tests pass. Update STATUS.md (note the stack change), commit as "feat: phase 5 contact form, remove database plan", stop.
```

## Phase 6 — Projects (Réalisations)

```text
Read AGENTS.md and docs/STATUS.md. Build the projects section from Astro content collections. No database.

- src/content.config.ts: a `projects` collection. One folder per project: src/content/projects/<slug>/index.md + photos next to it.
  Frontmatter (zod): status (draft | published), type (villa | riad | terrasse | pro | 3d), city, surface_m2?, year, sort_order, title {fr, ar, en}, summary {fr, ar, en}, cover (image()), images: [{ src: image(), kind: photo | render_3d | before | after | plan, alt {fr, ar, en} (required) }]. Body: one Markdown section per locale (or index.fr.md / index.ar.md / index.en.md — pick one and document it).
- Drafts never build in production.
- /[lang]/realisations: grid of published projects (cover, title, city, type). Asymmetric layout: first project large, the rest in a 2-column grid. Filter chips by type (client-side, URL hash).
- /[lang]/realisations/[slug]: title, meta (type, city, surface, year), gallery with a lightbox (swipe with momentum + rubber-band at the ends, Escape to close, focus returns to the thumbnail), and a before/after slider when the project has 'before' and 'after' images (pointer-captured drag, keyboard arrows, mirrored in RTL).
- Images through astro:assets <Image>/<Picture>: AVIF/WebP, width/height always set, lazy below the fold.
- Home "Réalisations" teaser: up to 3 latest published projects; if none, keep the honest placeholder. Never fake projects.
- JSON-LD per project (CreativeWork with image list).
- docs/adding-a-project.md: step by step (copy the template folder, add photos, fill the frontmatter, set status: published, git push → Vercel rebuilds). Include a template folder src/content/projects/_template/ that is ignored by the collection.
- Add 2 example projects with status: draft named "EXEMPLE — à supprimer" for local testing only.

Acceptance: with the 2 examples switched to published locally, pages render in FR/AR/EN; switched back to draft, the honest placeholder shows. Lighthouse mobile ≥ 90, CLS 0. lint, check, build, tests pass. Update STATUS.md, commit "feat: phase 6 projects from content collections", stop.
```

## Phase 7 — SEO, performance, accessibility

```text
Read AGENTS.md and docs/STATUS.md. Audit and finish.

- JSON-LD on the home page: HomeAndConstructionBusiness with name, logo, address, geo (34.1051351, -6.7560591), areaServed (Rabat, Salé, Kénitra, Témara), sameAs (Instagram), telephone from src/data/site.ts (omit while TODO).
- sitemap.xml (all locales, published projects), robots.txt, canonical + hreflang everywhere, OG image per page (generate at build with satori or a static template using the logo on white).
- Titles ≤ 60 chars, descriptions ≤ 155, French keywords: paysagiste Rabat, paysagiste Salé, aménagement jardin villa, conception jardin 3D Maroc.
- Lighthouse (mobile) on home, /realisations, one project, /contact in FR and AR. Fix everything below 90. axe in Playwright on every page: zero serious issues.
- Contrast check of every text color on its real background, including placeholders and disabled states.

Acceptance: a report table (page × locale × 4 Lighthouse scores) in docs/qa.md. Commit "chore: phase 7 seo, performance and accessibility", stop.
```

## Phase 8 — Deploy

```text
Read AGENTS.md and docs/STATUS.md. Prepare production.

- Vercel project linked to the repo; env vars (RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL, CONTACT_SIGNING_SECRET) set for Production and Preview, never committed. Node version pinned to match Vercel.
- Resend: verify the sending domain (SPF/DKIM DNS records); CONTACT_FROM_EMAIL on that domain.
- Custom domain (e.g. atlazra.ma + www redirect), HTTPS.
- docs/runbook.md: how to add a project (link docs/adding-a-project.md), where contact emails arrive, how to change the phone number (src/data/site.ts), how to roll back a deploy, monthly checks.

Acceptance: a production form submission arrives by email; pushing a new published project appears on the live site after the Vercel build.
```

---

## Review prompts (use after any phase)

**Design review (Claude Code)**
```text
Read AGENTS.md. Review the pages changed in the last commit against reference/index.html and the "Banned" list. Use the emil-design-eng skill. Answer with one table | Where | Problem | Fix |, then apply the fixes.
```

**Break it**
```text
Use the break-ui skill on the contact form and project pages: very long names, Arabic + French mixed text, 0 and 50 projects, huge photos, slow 3G. Fix what breaks.
```

**Animation audit**
```text
Use the review-animations skill on every transition and the 3D model interaction. Fix anything that uses ease-in, transition: all, durations over 300 ms for UI, or that cannot be interrupted.
```

## Install the skills once
```bash
npx skills@latest add emilkowalski/skills
```
