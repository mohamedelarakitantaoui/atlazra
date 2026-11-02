# AGENTS.md — Atlazra Design website

Read this file before every task. It is the source of truth for design and engineering decisions.
Then read `docs/STATUS.md` for the current phase, decisions and open TODOs. Update it at the end of every phase.
Claude Code reads it through `CLAUDE.md`; Codex reads it directly.

## The company
- **Atlazra Design**, landscaping company. Tagline: **« L'art des espaces verts »**.
- Activities: aménagement paysager · conception 3D · espaces extérieurs.
- Differentiator: every project starts with a **3D model** the client can change before work begins. Most Moroccan competitors don't show this step.
- Address: Dar Nizar, Rabat–Salé region. Google Maps: https://maps.app.goo.gl/6f43CHxzyrMHoT4f9 (pin lat 34.1051351, lng -6.7560591).
- Languages: **French (default), Arabic (RTL), English**.
- Audience: villa owners, riads, residences, businesses in Rabat / Salé / Kénitra.

## Reference design
`reference/index.html` is the approved visual reference (single-file prototype). Match its look and behavior.
When porting, keep its tokens, spacing, copy and interactions. Don't "improve" it into a template.

## Design rules (non-negotiable)

### Palette (single light theme, the client asked for white)
| Token | Value | Use |
|---|---|---|
| `--paper` | `#ffffff` | page background |
| `--mist` | `#f2f3f0` | quiet surfaces, 3D table, inputs |
| `--ink` | `#17201b` | text |
| `--ink-2` | `#56615a` | secondary text (AA on white and mist) |
| `--forest` | `#123d2c` | logo, primary buttons, focus ring |
| `--bronze` | `#8b693a` | rare small accent only (step labels) |

`--bronze` was darkened from the reference's `#9a7440` (3.81:1 on mist, 4.25:1 on white) to `#8b693a` (4.51:1 on mist, 5.02:1 on white), the smallest HSL-lightness change that lets the 0.8rem step labels pass AA. Same hue and saturation; `reference/index.html` keeps the old value.
| `--rule` | `rgba(23,32,27,.10)` | hairlines |

### Type
- Latin: system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, …`). Arabic: IBM Plex Sans Arabic.
- Headings weight 600, **negative tracking that scales with size** (h1 `-0.032em`, h2 `-0.025em`, body ~0). Arabic: tracking 0, line-height ≥1.3.
- Sentence case. The calligraphic serif lives **only in the logo**, never in headings.

### Logo
- Files in `public/brand/`: `atlazra-logo.svg` (full), `atlazra-mark.svg` (A + leaf), `atlazra-wordmark.svg`. All use `fill="currentColor"`.
- On white: color `--forest`. Bronze version only for special print/merch. Don't use the metallic PNG on the website.

### Banned (these make a site look AI-generated)
- Giant serif display headlines; italic emphasis words inside headings.
- Monospace uppercase "eyebrow" labels with an icon above every heading.
- Decorative numbering (01 / 02 / 03) when order is not information. Real sequences (project steps) may be numbered.
- Gradient text, purple/blue gradients, glassmorphism as decoration, neon glow.
- Centered hero + two buttons + three identical icon cards.
- Same rounded card + shadow on every block. Emoji as icons.
- Identical fade-up animation on every element. Scroll-jacking.
- Stock "smiling team" photos, invented testimonials, invented client logos, invented numbers.
- Copy words: "Unlock, Elevate, Empower, Seamless, Leverage, Delve, Transform your space", "It's not just X, it's Y".

### Motion and interaction (from emilkowalski/skills: apple-design + emil-design-eng)
- Feedback on **press**, not release: `:active { transform: scale(.97) }` 100 ms.
- Enter/exit: ease-out `cubic-bezier(.23,1,.32,1)`; UI transitions ≤ 300 ms. Never `ease-in` for UI. Never `transition: all`.
- Gestures (3D model drag, carousels): 1:1 tracking with pointer capture, release velocity handed to momentum, interruptible at any time.
- Springs critically damped by default; a little bounce only after a gesture with momentum.
- Translucent sticky header (`backdrop-filter`), solid under `prefers-reduced-transparency`.
- `prefers-reduced-motion`: cross-fades or instant changes, no springs, no momentum.
- Don't animate things people use many times (nav links, language switch).

### Layout
- Mobile-first; works at 360 px; no horizontal page scroll; tap targets ≥ 44 px.
- Side gutter `max(20px, env(safe-area-inset-*))`. Max content width 1160 px.
- RTL: use logical properties (`margin-inline-start`, `inset-inline-start`), mirror arrows, keep the 3D model LTR.

## Engineering rules
- Stack: Astro 5 + TypeScript (strict), plain CSS tokens, three.js island, Astro content collections for projects, Resend for the contact email, Vercel.
- Package manager: pnpm. Node 20+.
- Every page server-renders its content; JS only for islands (3D model and contact form).
- Secrets only in env vars, never in the browser.
- Validate every input on the server with zod. Contact spam protection uses a honeypot and HMAC-signed minimum fill time; no database or rate-limit store.
- No invented content: missing facts stay as `TODO(client): …` in content files and show as a neutral placeholder in the UI.
- Accessibility: one `h1` per page, landmarks, labels, visible focus, contrast AA, alt text on every photo.
- Performance budget: Lighthouse ≥ 90 in all four categories on mobile; LCP < 2.5 s; three.js loaded only when the model scrolls into view.
- Before finishing any task: run `pnpm check && pnpm build && pnpm test`, and take Playwright screenshots at 390 px and 1440 px in FR and AR.

## Open items from the client (TODO)
- Phone / WhatsApp number, email, opening hours.
- Confirm address label: "Dar Nizar" (the Maps pin is named "Top Dar Fleur").
- Confirm the service list (drip irrigation, pergolas, ponds, maintenance contracts?).
- Real project photos and 3D renders (before/after pairs if possible).
- Domain name (e.g. atlazra.ma) and the email that receives leads.
