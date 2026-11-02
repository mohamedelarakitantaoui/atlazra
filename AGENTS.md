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
`reference/redesign/atlazra-home.html` is the approved visual reference. `template.html` provides readable CSS, markup, FR/AR copy and interactions; `design-tokens.md`, `content.md`, `references.md` and `research.md` explain the decisions. This replaces `reference/index.html`. Use the assets as files; never paste base64 images or the mockup bundle. Match the approved look and behavior.
When porting, keep its tokens, spacing, copy and interactions. Don't "improve" it into a template.

## Design rules (non-negotiable)

### Palette (white base, emerald ink and gold accent)
| Token | Value | Use |
|---|---|---|
| `--paper` | `#FFFFFF` | page base |
| `--bone-50` / `--mist` | `#F6F2E9` | alternating quiet band, fields |
| `--bone-100` | `#EDE6D6` | alternating deeper bone band |
| `--ink-900` / `--forest` | `#1B4130` | giant word, headings, dark buttons, footer |
| `--ink-800` | `#153829` | plan and compare frames |
| `--ink-950` | `#112F22` | deepest frame |
| `--ink-on-bone` / `--ink` | `#0F2419` | body text |
| `--muted-bone` / `--ink-2` | `#465649` | secondary text |
| `--accent` | `#C9A26B` | main CTAs, plan pins, monogram, contact band |
| `--accent-ink` | `#0A2618` | text on gold |
| `--accent-text` / `--bronze` | `#7A5B2C` | small accent text on white or bone |
| `--rule` / `--line` | `rgba(15,36,25,.14)` | hairlines |

Gold is never small text on white. Every small-text pair must meet 4.5:1.
White and bone alternate; the contact band is gold and the footer emerald.

### Type
- Display: self-hosted Big Shoulders Display 800/900; condensed uppercase, tracking about -0.005em, line-height .88–.95.
- Body: self-hosted Manrope 400–700. Labels: self-hosted IBM Plex Mono 500, 12–13px with editorial tracking.
- Arabic: IBM Plex Sans Arabic with the existing subset and size-matched fallback. Arabic tracking 0, line-height ≥1.3. Never force Latin uppercase styling on Arabic.
- All web fonts use font-display: swap; no Google Fonts at runtime.
- No italic emphasis inside headings. No invented facts. Missing facts stay `TODO(client): …` in content and use a neutral placeholder in the UI.

### Six signature moves
1. Sandwich hero: giant ATLAZRA behind a live transparent 3D garden, corner UI in front; gold monogram replaces the first A. The word and model stay LTR in every locale.
2. Emerald and gold on white: emerald brand ink, monogram-derived gold accent, warm bone bands.
3. Poster corners: logo and navigation above; h1 and CTAs mid-start, four-step index mid-end, state toggle bottom-start, towns bottom-center, drag hint bottom-end.
4. Monogram symbol: use the supplied transparent gold leaf/A in the hero, brand, footer, favicon and 404.
5. Condensed display type: Big Shoulders Display with Manrope and Plex Mono; Plex Sans Arabic for Arabic.
6. Editorial labels: numbered chapters, [01] service rows, hairlines, one pausable towns marquee, giant footer word. Chapter counters are isolated LTR in Arabic.

### Logo
- The approved transparent gold assets are in `reference/redesign/assets/`; optimized files are served from `public/redesign/`.
- Earlier vector assets in `public/brand/` remain available for structured data and print; the redesigned site uses the approved gold monogram.

### Banned (these make a site look AI-generated)
- Giant serif display headlines; italic emphasis words inside headings.
- Generic uppercase labels with an icon above every heading. Editorial chapter labels from the approved reference are intentional.
- Meaningless decorative numbering. Chapter navigation, service indexes, plan callouts and real project steps may be numbered.
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
- Reference header stays in normal flow. Any translucent controls become solid under `prefers-reduced-transparency`.
- `prefers-reduced-motion`: cross-fades or instant changes, no springs, no momentum.
- Don't animate things people use many times (nav links, language switch).

### Layout
- Mobile-first; works at 360 px; no horizontal page scroll; tap targets ≥ 44 px.
- Side gutter `max(20px, env(safe-area-inset-*))`. Max content width 1440 px, matching the new reference.
- RTL: use logical properties (`margin-inline-start`, `inset-inline-start`), mirror arrows, keep the 3D model LTR.

## Engineering rules
- Stack: Astro 5 + TypeScript (strict), plain CSS tokens, three.js island, Astro content collections for projects, Resend for the contact email, Vercel.
- Package manager: pnpm. Node 20+.
- Every page server-renders its content; JS only for progressive interactive components (3D model, contact form, menu, plan pins, comparison, project controls and marquee pause).
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
