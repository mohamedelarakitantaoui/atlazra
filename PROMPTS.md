# Atlazra Design — build prompts for Codex / Claude Code

Run the phases **in order**, one prompt per agent session. Each prompt is self-contained: paste it as is.
After each phase: review the diff, run the site, commit. Don't start a phase until the previous one passes its checks.

**Who does what (suggested)**
- **Claude Code**: phases with design judgment and multi-file refactors (1, 2, 3, 4, 8).
- **Codex**: well-specified backend and test work (5, 6, 7, 9, 10). Either agent can do any phase.
- Use git worktrees if you run two agents in parallel (e.g. phase 5 + phase 3). Never let two agents edit the same files.

## Architecture at a glance

```
Browser ── Astro pages (static, FR/AR/EN) ── islands: 3D model · contact form · admin
                     │
                     ├── /api/leads (server) ── zod ── Supabase Postgres (leads) ── Resend email
                     ├── /api/revalidate (server) ── Vercel deploy hook
                     └── /admin (Supabase Auth, allowlisted emails) ── projects + photos (Storage)
```

| Layer | Choice | Why |
|---|---|---|
| Frontend | Astro 5, TypeScript, plain CSS tokens | Fast static pages, built-in i18n, islands only where needed |
| 3D | three.js (lazy island) | The signature: the client sees the garden before work |
| Database | Supabase Postgres + Row Level Security | You already know it; auth + storage included |
| Files | Supabase Storage bucket `project-photos` | Project photos and 3D renders |
| Email | Resend | New lead → email to Atlazra |
| Hosting | Vercel | Astro adapter, preview deploys per branch |

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

## Phase 5 — Database (Supabase)

```text
Read AGENTS.md. Create the Supabase schema as SQL migrations in supabase/migrations/ (use the Supabase CLI: `supabase init`, `supabase migration new`).

Tables:

leads
- id uuid pk default gen_random_uuid()
- created_at timestamptz default now()
- name text not null check (char_length(name) between 2 and 120)
- phone text not null check (char_length(phone) between 6 and 30)
- email text null
- project_type text not null check (project_type in ('villa','riad','terrasse','pro','3d'))
- surface_m2 integer null check (surface_m2 > 0 and surface_m2 < 1000000)
- city text null
- message text not null check (char_length(message) between 4 and 4000)
- locale text not null check (locale in ('fr','ar','en'))
- status text not null default 'new' check (status in ('new','contacted','visit_planned','quoted','won','lost'))
- source text null  -- utm or referrer
- notes text null   -- internal

projects
- id uuid pk, created_at, updated_at (trigger)
- slug text unique not null
- status text not null default 'draft' check (status in ('draft','published'))
- type text not null (same values as lead project_type)
- city text, surface_m2 integer, year integer
- title jsonb not null       -- {"fr": "...", "ar": "...", "en": "..."}
- summary jsonb not null
- body jsonb null            -- rich text per locale (markdown strings)
- cover_image_id uuid null references project_images(id) on delete set null (add after project_images exists)
- sort_order integer default 0

project_images
- id uuid pk, created_at
- project_id uuid not null references projects(id) on delete cascade
- storage_path text not null      -- in bucket project-photos
- kind text not null check (kind in ('photo','render_3d','before','after','plan'))
- alt jsonb not null              -- per locale, required
- width int, height int, sort_order int default 0

site_settings (single row, id = 1)
- phone text, whatsapp text, email text, hours jsonb, instagram text, address jsonb, updated_at

admin_users
- email text pk   -- allowlist checked by RLS

Row Level Security:
- leads: no public select/update/delete. Inserts only through the server API (service role). Admins (auth.email() in admin_users) can select and update.
- projects / project_images: public select only where status = 'published' (images through their project); admins full access.
- site_settings: public select; admins update.
- Storage bucket project-photos: public read; write only for admins.

Also: indexes on leads(created_at desc), leads(status), projects(status, sort_order); seed.sql with site_settings row (values TODO) and 2 draft example projects clearly named "EXEMPLE — à supprimer".
Generate TypeScript types into src/lib/database.types.ts (`supabase gen types typescript`).

Acceptance: `supabase db reset` runs clean locally; a SQL test file proves anon cannot read leads and can read only published projects.
```

## Phase 6 — Backend: contact form and leads

```text
Read AGENTS.md. Build the lead pipeline.

- src/lib/supabase/server.ts: server-only client with the service role key (throws if imported in client code).
- src/pages/api/leads.ts (prerender = false), POST JSON:
  - zod schema matching the leads table; normalize Moroccan phone numbers (0612…, +212612…, 00212…) to E.164.
  - Spam protection: hidden honeypot field, minimum fill time (3 s, signed timestamp), and rate limit 5 requests / 10 min per IP (Upstash Ratelimit or a Supabase table — pick one and justify in a comment).
  - Insert into leads; then send an email with Resend to LEADS_TO_EMAIL (subject: "Nouvelle demande — {type} — {name}", body with all fields and a WhatsApp link wa.me/{phone}). Email failure must not lose the lead (log it, still return 201).
  - Responses: 201 {ok:true} | 400 {errors:{field:message}} localized | 429.
- Contact form island (/contact page and home teaser): same UI as the reference (chips for project type, inline validation on blur, submit button with loading state, success state that replaces the form, error state with retry). Works without JS as a normal form POST (progressive enhancement, redirect to /{lang}/contact/merci).
- Add a "Écrire sur WhatsApp" button that opens wa.me with a prefilled message, using site_settings.whatsapp.

Acceptance: Vitest unit tests for the zod schema and phone normalization; Playwright test submits the form, sees the success state, and the row exists in the local Supabase; spam test (honeypot filled) gets 400 without inserting.
```

## Phase 7 — Projects (Réalisations)

```text
Read AGENTS.md. Build the projects section from Supabase data.

- /[lang]/realisations: grid of published projects (cover image, title, city, type). Asymmetric layout: first project large, the rest in a 2-column grid. Filter chips by type (client-side, URL hash).
- /[lang]/realisations/[slug]: title, meta (type, city, surface, year), gallery with a lightbox (swipe with momentum + rubber-band at the ends, Escape to close, focus returns to the thumbnail), and a before/after comparison slider when the project has 'before' and 'after' images (pointer-captured drag, keyboard arrows).
- Pages are prerendered at build time (getStaticPaths from Supabase). /api/revalidate (POST, admin only) calls VERCEL_DEPLOY_HOOK_URL so publishing a project rebuilds the site.
- Images: Supabase Storage image transformations or Astro <Image> with remote patterns; always width/height, lazy below the fold, AVIF/WebP.
- If no project is published: show the honest placeholder block from the reference, never fake projects.
- JSON-LD for each project (CreativeWork with image list).

Acceptance: with the 2 seed projects published locally, both pages render in FR/AR/EN; Lighthouse ≥ 90; no layout shift from images.
```

## Phase 8 — Admin

```text
Read AGENTS.md. Build a small admin for the Atlazra team at /admin (noindex, excluded from sitemap).

- Auth: Supabase magic link; only emails in admin_users can enter (check server-side on every admin route and API).
- Leads inbox: table sorted by date, status pill (new/contacted/visit planned/quoted/won/lost) changeable inline, notes field, click-to-call and WhatsApp buttons, CSV export, a count of new leads in the header.
- Projects: list + create/edit form with FR/AR/EN tabs for title, summary, body; type, city, surface, year, status draft/published; photo uploader (drag and drop, client-side resize to max 2400 px and WebP, kind selector, alt text per locale required before saving, reorder by drag); "Publish" triggers /api/revalidate.
- Settings: edit phone, WhatsApp, email, hours, Instagram (site_settings).
- Same design tokens as the public site; a utilitarian treatment, no marketing styling.

Acceptance: a non-allowlisted email is rejected; an admin can create a project with 3 photos, publish it, and see it on /fr/realisations after the rebuild.
```

## Phase 9 — SEO, performance, accessibility

```text
Read AGENTS.md. Audit and finish.

- JSON-LD on the home page: LocalBusiness (or HomeAndConstructionBusiness) with name, logo, address, geo (34.1051351, -6.7560591), areaServed (Rabat, Salé, Kénitra, Témara), sameAs (Instagram), telephone from settings.
- sitemap.xml (all locales, published projects), robots.txt, canonical + hreflang everywhere, OG image per page (generate with satori or a static template using the logo on white).
- Titles ≤ 60 chars, descriptions ≤ 155, French keywords: paysagiste Rabat, paysagiste Salé, aménagement jardin villa, conception jardin 3D Maroc.
- Run Lighthouse (mobile) on home, /realisations, one project, /contact in FR and AR. Fix everything below 90. Run axe in Playwright on every page: zero serious issues.
- Check contrast of every text color on its real background, including placeholders and disabled states.

Acceptance: a report table (page × locale × 4 Lighthouse scores) in docs/qa.md.
```

## Phase 10 — Deploy

```text
Read AGENTS.md. Prepare production.

- Vercel project linked to the repo; env vars set for Production and Preview (never commit them).
- Supabase production project: run migrations, create the storage bucket and policies, insert admin_users and site_settings.
- Resend: verify the sending domain (SPF/DKIM DNS records), set LEADS_FROM_EMAIL on that domain.
- Custom domain (e.g. atlazra.ma + www redirect), HTTPS.
- Vercel deploy hook URL stored in VERCEL_DEPLOY_HOOK_URL.
- Write docs/runbook.md: how to add a project, how leads arrive, how to change the phone number, how to roll back a deploy, monthly checks.

Acceptance: production form submission arrives by email and in the admin inbox; publishing a project from the admin appears on the live site within 3 minutes.
```

---

## Review prompts (use after any phase)

**Design review (Claude Code)**
```text
Read AGENTS.md. Review the pages changed in the last commit against reference/index.html and the "Banned" list. Use the emil-design-eng skill. Answer with one table | Where | Problem | Fix |, then apply the fixes.
```

**Break it**
```text
Use the break-ui skill on the contact form, project pages and admin tables: very long names, Arabic + French mixed text, 0 and 500 projects, huge photos, slow 3G. Fix what breaks.
```

**Animation audit**
```text
Use the review-animations skill on every transition and the 3D model interaction. Fix anything that uses ease-in, transition: all, durations over 300 ms for UI, or that cannot be interrupted.
```

## Install the skills once
```bash
npx skills@latest add emilkowalski/skills
```
