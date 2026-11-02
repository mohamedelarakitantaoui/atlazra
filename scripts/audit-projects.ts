import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { mkdir, writeFile } from 'node:fs/promises';
import { serveBuilt } from './serve-built.ts';

const draft = process.argv.includes('--draft');
const directory = `artifacts/phase-6/${draft ? 'drafts' : 'examples'}`;
await mkdir(directory, { recursive: true });
const server = await serveBuilt(4177);
const browser = await chromium.launch({
  args: ['--remote-debugging-port=9225'],
});
try {
  for (const locale of ['fr', 'ar'])
    for (const width of [390, 1440]) {
      for (const route of draft
        ? ['', 'realisations/']
        : ['realisations/', 'realisations/exemple-villa/']) {
        const name = route.includes('exemple')
          ? 'story'
          : route
            ? 'grid'
            : 'home';
        const page = await browser.newPage({
          viewport: { width, height: 1000 },
        });
        const response = await page.goto(`${server.url}/${locale}/${route}`);
        if (response?.status() !== 200)
          throw new Error(`Missing ${locale}/${route}`);
        await page.evaluate(() => document.fonts.ready);
        // Load below-fold images before a full-page screenshot.
        await page.evaluate(async () => {
          const images = [...document.querySelectorAll('main img')];
          images.forEach((img) => img.setAttribute('loading', 'eager'));
          await Promise.all(
            images.map((img) =>
              (img as HTMLImageElement).decode().catch(() => {}),
            ),
          );
        });
        await page.screenshot({
          path: `${directory}/${name}-${locale}-${width}.png`,
          fullPage: true,
        });
        await page.close();
      }
    }
  const summary: Record<string, unknown> = {};
  for (const locale of ['fr', 'ar'])
    for (const route of draft
      ? ['realisations/']
      : ['realisations/', 'realisations/exemple-villa/']) {
      const name = `${locale}-${route.includes('exemple') ? 'story' : 'grid'}`;
      const result = await lighthouse(`${server.url}/${locale}/${route}`, {
        port: 9225,
        logLevel: 'error',
        output: ['json', 'html'],
        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
        ],
      });
      if (!result) throw new Error('Missing Lighthouse result');
      const reports = result.report as string[];
      await writeFile(`${directory}/lighthouse-${name}.json`, reports[0]);
      await writeFile(`${directory}/lighthouse-${name}.html`, reports[1]);
      summary[name] = {
        scores: Object.fromEntries(
          Object.entries(result.lhr.categories).map(([key, value]) => [
            key,
            Math.round((value.score ?? 0) * 100),
          ]),
        ),
        lcpMs: result.lhr.audits['largest-contentful-paint'].numericValue,
        cls: result.lhr.audits['cumulative-layout-shift'].numericValue,
        runtimeError: result.lhr.runtimeError,
      };
    }
  await writeFile(
    `${directory}/summary.json`,
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary));
} finally {
  await browser.close();
  await server.close();
}
