/** Widths written by scripts/render-garden-poster.ts as public/garden-poster-{w}.webp. */
export const POSTER_WIDTHS = [640, 960, 1440, 2160] as const;

export const posterSrcset = POSTER_WIDTHS.map(
  (width) => `/garden-poster-${width}.webp ${width}w`,
).join(', ');

/**
 * The slot's rendered width (.hero-grid in pages/[lang]/index.astro, .wrap in
 * base.css): one column up to 920 px; above that 7/12 of the 1160 px wrap
 * minus 40 px gutters and a clamp(28px, 4vw, 56px) gap.
 */
export const posterSizes = [
  '(min-width: 1440px) 690px',
  '(min-width: 861px) 48vw',
  'calc(100vw - 40px)',
].join(', ');
