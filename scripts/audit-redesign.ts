// Phase 6c: every public page in FR/AR at 1440, 1024, 768 and 390 px.
// Usage: node scripts/audit-redesign.ts <label> [--lighthouse] [--runs=N] [--examples]
// With --runs=N each page is audited N times and the run with the median
// LCP is reported (all LCPs are kept).
// Writes screenshots, a layout report and Lighthouse summaries to
// artifacts/phase-6c/<label>/ (ignored by Git). Run after `pnpm build`.
import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import type { Result } from 'lighthouse';
import { mkdir, writeFile } from 'node:fs/promises';
import { serveBuilt } from './serve-built.ts';

const label = process.argv[2];
const runs = Number(
  process.argv.find((arg) => arg.startsWith('--runs='))?.slice(7) ?? 1,
);
if (!label || label.startsWith('--'))
  throw new Error('Usage: audit-pages.ts <label> [--lighthouse]');
const directory = `artifacts/phase-6c/${label}`;
await mkdir(directory, { recursive: true });
process.env.CONTACT_SIGNING_SECRET = 'local-lighthouse-audit-secret';

const routes: Record<string, string> = {
  home: '',
  services: 'services/',
  grid: 'realisations/',
  ...(process.argv.includes('--examples')
    ? {
        story: 'realisations/exemple-villa/',
        terrace: 'realisations/exemple-terrasse/',
      }
    : {}),
  thanks: 'contact/merci/',
  contact: 'contact/',
  legal: 'mentions-legales/',
  privacy: 'confidentialite/',
  notfound: 'page-introuvable/',
};
const only=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7).split(',');
if(only)for(const key of Object.keys(routes))if(!only.includes(key))delete routes[key];
// Lighthouse refuses an HTTP 404. These local audit-only endpoints return the
// identical server-rendered 404 HTML with status 200; real routes stay 404.
const server = await serveBuilt(
  4178,
  Object.fromEntries(
    ['fr', 'ar'].map((locale) => [
      `/__qa/404-${locale}.html`,
      (_request, response) => {
        void fetch(`http://127.0.0.1:4178/${locale}/page-introuvable/`).then(
          async (result) => {
            response.writeHead(200, {
              'Content-Type': 'text/html; charset=utf-8',
            });
            response.end(await result.text());
          },
        );
      },
    ]),
  ),
);
const browser = await chromium.launch({
  args: ['--remote-debugging-port=9226'],
});
const layout: Record<string, unknown> = {};
const links = new Map<string,number>();
try {
  if(!process.argv.includes('--no-screenshots')) for (const locale of ['fr', 'ar'])
    for (const width of [1440, 1024, 768, 390])
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
        for(const path of await page.evaluate(()=>[...new Set([...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map(a=>new URL(a.href)).filter(url=>url.origin===location.origin).map(url=>url.pathname))])){
          if(!links.has(path))links.set(path,(await fetch(server.url+path)).status);
        }
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
            missingAlt: [...document.querySelectorAll('img')].filter(img=>!img.hasAttribute('alt')).length,
            headings: [...document.querySelectorAll('h1, h2, h3, h4')].map(
              (h) =>
                `${h.tagName} ${(h.textContent ?? '').trim().slice(0, 40)}`,
            ),
            small,
          };
        });
        if(name==='home'){
          const sections=page.locator('main > section');
          for(let index=0;index<await sections.count();index++)await sections.nth(index).screenshot({path:`${directory}/home-${locale}-${width}-section-${index}.png`});
        }
        await page.evaluate(()=>scrollTo(0,0));
        await page.screenshot({
          path: `${directory}/${name}-${locale}-${width}-hero.png`,
        });
        await page.screenshot({
          path: `${directory}/${name}-${locale}-${width}.png`,
          fullPage: true,
        });
        await page.setViewportSize({ width: 360, height: 900 });
        (
          layout[`${name}-${locale}-${width}`] as Record<string, unknown>
        ).overflow360 = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        await page.close();
      }
  await writeFile(`${directory}/layout.json`, JSON.stringify(layout, null, 2));
  await writeFile(`${directory}/links.json`,JSON.stringify(Object.fromEntries(links),null,2));

  if (process.argv.includes('--lighthouse')) {
    const summary: Record<string, unknown> = {};
    for (const locale of ['fr', 'ar'])
      for (const [name, route] of Object.entries(routes)) {
        // Lighthouse refuses 404 responses; audit the same page as a file.
        const url =
          name === 'notfound'
            ? `${server.url}/__qa/404-${locale}.html`
            : `${server.url}/${locale}/${route}`;
        const reports: Result[] = [];
        for (let run = 0; run < runs; run++) {
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
          reports.push(result.lhr);
        }
        const lcp = (report: Result) =>
          report.audits['largest-contentful-paint'].numericValue ?? 0;
        reports.sort((a, b) => lcp(a) - lcp(b));
        const lhr = reports[Math.floor(reports.length / 2)];
        await writeFile(
          `${directory}/lighthouse-${name}-${locale}.json`,
          JSON.stringify(lhr),
        );
        summary[`${name}-${locale}`] = {
          runsLcpMs: reports.map((report) => Math.round(lcp(report))),
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
        console.log(
          `${name}-${locale}: ${JSON.stringify(summary[`${name}-${locale}`])}`,
        );
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
