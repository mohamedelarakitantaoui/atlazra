# Atlazra Design — website

Start here:

1. `AGENTS.md` — design + engineering rules (Claude Code reads it via `CLAUDE.md`).
2. `PROMPTS.md` — phase-by-phase prompts (0 → 10) to build frontend, backend and database.
3. `reference/index.html` — approved design prototype (open it in a browser).
4. `assets/brand/` — logo: `atlazra-logo.svg`, `atlazra-mark.svg`, `atlazra-wordmark.svg` (currentColor), PNG versions in forest, bronze and gold.

## Development

Use Node 22.12+ (CI uses Node 22) and pnpm 10.18.3.

```sh
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

Public pages are `/fr/`, `/ar/` (RTL), `/en/`, and `/contact/` under each locale.
The shared header/footer follow the reference; home has introductory copy and
section anchors, and contact shows the confirmed map plus neutral placeholders.
The full reference sections, 3D model and lead form remain for later phases.
`reference/` is never served or formatted. The three SVGs
in `public/brand/` are byte-for-byte copies of the source assets.

```sh
pnpm lint
pnpm check
pnpm build
pnpm test
pnpm format
```

The Chromium smoke test checks the French heading, then captures French and Arabic
at 390 px and 1440 px in `test-results/`. CI uploads these results on every PR.
Playwright serves the production build (run `pnpm build` before `pnpm test`) through
`tests/serve.ts`, which follows Vercel's generated route table and runs the built
function; garden tests run serially after the rest.

## Phase 1 UI primitives

Open `/fr/dev/ui/` (French), `/ar/dev/ui/` (Arabic RTL), or `/en/dev/ui/` (English).
The static showcase is marked `noindex` and demonstrates only the UI primitives.
Production sections and form submission are deferred to later phases.

- `src/styles/tokens.css`: reference tokens, approved semantic aliases and spacing scale.
- `src/styles/base.css`: base typography, container, focus and reduced-motion styles; imports tokens and local Arabic fonts (400/500/600).
- `src/components/ui/Logo.astro`: `variant="full|mark|wordmark"`, optional `label` / `decorative`.
- `Button.astro`: `variant="primary|quiet"`; `href` renders an anchor, otherwise a native button; native attributes pass through.
- `SegmentedControl.astro`: `label`, `options: { value, label }[]`, `value`; radio-group keyboard interaction and bubbling `change` event with `detail.value`.
- `AccordionRow.astro`: unique `id`, `title`, optional `summary` / `open`, default content slot and optional `icon` slot. Closed content is inert.
- `Chip.astro`: static content label, never focusable.
- `ChoiceChip.astro`: native radio input with a label; requires unique `id`, shared group `name`, and `value`; supports native `checked`, keyboard selection and a focus-visible ring.
- `Field.astro`: unique `id`, `label`, `as="input|textarea"`, optional `error`; native input attributes pass through. Error text is associated with the field; validation is the consumer's responsibility.

Component comments identify their reference selectors. Segmented controls use the
approved thumb shadow and 44px tap targets required by `AGENTS.md`; positioning is
left to the consumer. The full logo uses the existing 58px mark measurement.
No 3D palette is included in the tokens.

All showcase URLs are locale-prefixed, marked `noindex, nofollow`, and explicitly
excluded by the sitemap integration's filter. `/dev/ui/` is no longer a route.
`SITE_URL` defaults to `https://atlazra.ma` as an explicit placeholder until the
domain is bought. Override it with the confirmed canonical origin before launch.
The sitemap is generated with FR/AR/EN alternate links and excludes `/*/dev/*`.

`tests/ui.spec.ts` exercises press feedback, keyboard selection, thumb placement,
accordion focus isolation, field error association and reduced motion. It captures
four showcase screenshots (FR/AR × 390/1440) and attaches them to Playwright results.

## Locale routing and shared shell

Astro i18n uses `fr`, `ar`, `en`, default `fr`, with `prefixDefaultLocale: true`.
Automatic default-locale redirects are disabled so `src/middleware.ts` can negotiate
only `/` using `Accept-Language`, including region tags and quality weights. It
returns a temporary 302 to `/ar/` or `/en/` when preferred, otherwise `/fr/`, with
`Vary: Accept-Language` and `Cache-Control: private, no-store`. Explicit locale URLs
are authoritative and are never changed by browser language detection.

Middleware runs inside the Vercel Node function (`_render`), not as an Edge
function: the adapter's Edge wrapper forwards only headers to the function, which
would drop the contact form's POST method and body. `src/pages/index.ts`, the contact
pages and `/api/contact/` are the on-demand routes; localized pages are static. The
generated Vercel route table sends `/` to `_render`. There is no client-side locale
redirect or flash of another language. `security.allowedDomains` in
`astro.config.mjs` lists the hosts the function trusts (the `SITE_URL` domain,
`www.`, `*.vercel.app` previews, loopback for local tests); without it Astro rebuilds
every request URL as `localhost` and its origin check rejects form POSTs.

Playwright runs against the production build (`pnpm build` first), served by
`tests/serve.ts`, which follows `.vercel/output/config.json` and mocks Resend.
Live Vercel behavior still requires deployment validation.

`LanguageSwitcher.astro` maps the current pathname to the equivalent locale path.
Query parameters and fragments are retained; the fragment is added client-side
because browsers do not send it in HTTP requests. Home, contact and every locale's
UI showcase are tested in all three destination locales. Navigation/menu and
language targets are at least 44px; the header uses the reference spacing with a
compact gap below 380px to fit those targets on a 360px screen.

`tests/site.spec.ts` checks every built content page against its language-switch
coverage, root redirects, sitemap alternates/exclusions, mobile menu behavior, and
eight home/contact screenshots (FR/AR × 390/1440). Tokens remain unchanged.

## Deployment and environment

Copy `.env.example` to `.env` locally and set values in Vercel for deployment.
Only `PUBLIC_` variables may be imported into browser code. Keep the service-role
key, Resend key, deploy hook and admin configuration on the server.
No credentials are needed to check, build or test this starter.

Astro uses `output: 'static'` with `@astrojs/vercel`. Future API routes can opt into
on-demand rendering by exporting `prerender = false`, for example:

```ts
// src/pages/api/example.ts
import type { APIRoute } from 'astro';
export const prerender = false;
export const GET: APIRoute = () => Response.json({ ok: true });
```

No public API endpoints are implemented yet. Any future endpoint accepting input
must add server-side zod validation and rate limiting as required by `AGENTS.md`.
