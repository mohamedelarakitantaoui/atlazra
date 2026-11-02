// Phase 6b review: every public page in FR/AR at 390 and 1440 px.
// Usage: node scripts/audit-pages.ts <label> [--lighthouse]
// Writes screenshots, a layout report and Lighthouse summaries to
// artifacts/phase-6b/<label>/ (ignored by Git). Run after `pnpm build`.
import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { mkdir, writeFile } from 'node:fs/promises';
import { serveBuilt } from './serve-built.ts';

const label = process.argv[2];
if (!label || label.startsWith('--'))
  throw new Error('Usage: audit-pages.ts <label> [--lighthouse]');
const directory = `artifacts/phase-6b/${label}`;
await mkdir(directory, { recursive: true });
process.env.CONTACT_SIGNING_SECRET = 'local-lighthouse-audit-secret';

const routes: Record<string, string> = {
  home: '',
  services: 'services/',
  grid: 'realisations/',
  story: 'realisations/exemple-villa/',
  contact: 'contact/',
  legal: 'mentions-legales/',
  privacy: 'confidentialite/',
  notfound: 'page-introuvable/',
};
const server = await serveBuilt(4178);
const browser = await chromium.launch({
  args: ['--remote-debugging-port=9226'],
});
const layout: Record<string, unknown> = {};
try {
  for (const locale of ['fr', 'ar'])
    for (const width of [390, 1440])
      for (const [name, route] of Object.entries(routes)) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
        });
        const response = await page.goto(`${server.url}/${locale}/${route}`);
        const expected = name === 'notfound' ? 404 : 200;
        if (response?.status() !== expected) {
          layout[`${name}-${locale}-${width}`] = { status: response?.status() };
          await page.close();
          continue;
        }
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(async () => {
          const images = [...document.querySelectorAll('main img')];
          images.forEach((img) => img.setAttribute('loading', 'eager'));
          await Promise.all(
            images.map((img) =>
              (img as HTMLImageElement).decode().catch(() => {}),
            ),
          );
        });
        layout[`${name}-${locale}-${width}`] = await page.evaluate(() => {
          const small = [
            ...document.querySelectorAll<HTMLElement>(
              'a[href], button, input, select, textarea, summary, [role="slider"]',
            ),
          ]
            .filter((el) => {
              // Links inside running text are exempt (WCAG 2.5.8 inline).
              if (el.closest('p, li > small, .prose')) return false;
              const box = el.getBoundingClientRect();
              if (!box.width || !box.height) return false;
              return box.width < 44 || box.height < 44;
            })
            .map((el) => {
              const box = el.getBoundingClientRect();
              return `${el.tagName.toLowerCase()}.${el.className || '-'} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(box.width)}×${Math.round(box.height)}`;
            });
          return {
            overflow:
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
            h1: document.querySelectorAll('h1').length,
            headings: [...document.querySelectorAll('h1, h2, h3, h4')].map(
              (h) =>
                `${h.tagName} ${(h.textContent ?? '').trim().slice(0, 40)}`,
            ),
            small,
          };
        });
        await page.screenshot({
          path: `${directory}/${name}-${locale}-${width}.png`,
          fullPage: true,
        });
        await page.close();
      }
  await writeFile(`${directory}/layout.json`, JSON.stringify(layout, null, 2));

  if (process.argv.includes('--lighthouse')) {
    const summary: Record<string, unknown> = {};
    for (const locale of ['fr', 'ar'])
      for (const [name, route] of Object.entries(routes)) {
        // Lighthouse refuses 404 responses; audit the same page as a file.
        const url =
          name === 'notfound'
            ? `${server.url}/404.html`
            : `${server.url}/${locale}/${route}`;
        if (name === 'notfound' && locale !== 'fr') continue;
        const result = await lighthouse(url, {
          port: 9226,
          logLevel: 'error',
          output: 'json',
          onlyCategories: [
            'performance',
            'accessibility',
            'best-practices',
            'seo',
          ],
        });
        if (!result) throw new Error('Missing Lighthouse result');
        const { lhr } = result;
        summary[`${name}-${locale}`] = {
          scores: Object.fromEntries(
            Object.entries(lhr.categories).map(([key, value]) => [
              key,
              Math.round((value.score ?? 0) * 100),
            ]),
          ),
          lcpMs: Math.round(
            lhr.audits['largest-contentful-paint'].numericValue ?? 0,
          ),
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          failing: Object.values(lhr.audits)
            .filter(
              (audit) =>
                audit.score !== null &&
                audit.score < 0.9 &&
                audit.scoreDisplayMode === 'binary',
            )
            .map((audit) => audit.id),
          runtimeError: lhr.runtimeError,
        };
      }
    await writeFile(
      `${directory}/lighthouse.json`,
      JSON.stringify(summary, null, 2),
    );
    console.log(JSON.stringify(summary, null, 1));
  }
} finally {
  await browser.close();
  await server.close();
}
