import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { mkdir, writeFile } from 'node:fs/promises';
import { serveBuilt } from './serve-built.ts';

const directory = 'test-results/phase-5-performance';
await mkdir(directory, { recursive: true });
// Local audit only. The production environment must supply its own secret.
process.env.CONTACT_SIGNING_SECRET = 'local-lighthouse-audit-secret';
const server = await serveBuilt(4176);
const browser = await chromium.launch({
  args: ['--remote-debugging-port=9224'],
});
try {
  // Screenshots use the real built data (WhatsApp remains hidden while TODO).
  for (const locale of ['fr', 'ar', 'en'])
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.goto(`${server.url}/${locale}/contact/`);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `${directory}/contact-${locale}-${width}.png`,
        fullPage: true,
      });
      await page.close();
    }
  const summary: Record<string, unknown> = {};
  for (const locale of ['fr', 'ar']) {
    const result = await lighthouse(`${server.url}/${locale}/contact/`, {
      port: 9224,
      logLevel: 'error',
      output: ['json', 'html'],
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    if (!result) throw new Error('Missing Lighthouse result');
    const reports = result.report as string[];
    await writeFile(`${directory}/lighthouse-${locale}.json`, reports[0]);
    await writeFile(`${directory}/lighthouse-${locale}.html`, reports[1]);
    summary[locale] = {
      lighthouseVersion: result.lhr.lighthouseVersion,
      scores: Object.fromEntries(
        Object.entries(result.lhr.categories).map(([key, value]) => [
          key,
          Math.round((value.score ?? 0) * 100),
        ]),
      ),
      lcpMs: result.lhr.audits['largest-contentful-paint'].numericValue,
      tbtMs: result.lhr.audits['total-blocking-time'].numericValue,
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
