/* global document */
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const directory = 'artifacts/phase-6c/reference';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({reducedMotion:'reduce'});
  await page.route('**/reference/redesign/atlazra-home.html', async (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body:
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        (await readFile('reference/redesign/atlazra-home.html', 'utf8')),
    }),
  );
  // Same fonts as the reference, served locally so QA is reproducible offline.
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ contentType: 'text/css', body: '' }),
  );
  await page.goto('http://127.0.0.1:4325/reference/redesign/atlazra-home.html');
  await page.addStyleTag({
    content:
      [
        ['Big Shoulders Display', 'big-shoulders-display', 800],
        ['Big Shoulders Display', 'big-shoulders-display', 900],
        ...[400, 500, 600, 700].map((w) => ['Manrope', 'manrope', w]),
        ['IBM Plex Mono', 'ibm-plex-mono', 500],
      ]
        .map(
          ([family, slug, w]) =>
            `@font-face{font-family:'${family}';font-weight:${w};src:url('/node_modules/@fontsource/${slug}/files/${slug}-latin-${w}-normal.woff2')}`,
        )
        .join('\n') +
      [400, 500, 700]
        .map(
          (w) =>
            `@font-face{font-family:'IBM Plex Sans Arabic';font-weight:${w};src:url('/node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-${w}-normal.woff2')}`,
        )
        .join('\n'),
  });
  for (const width of [1440, 390])
    for (const locale of ['fr', 'ar']) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator(`[data-lang="${locale}"]`).click();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `${directory}/${locale}-${width}.png`,
        fullPage: true,
      });
      await page.screenshot({
        path: `${directory}/${locale}-${width}-hero.png`,
      });
    }
  await writeFile(
    `${directory}/opened.json`,
    JSON.stringify(
      {
        url: page.url(),
        viewports: [1440, 390],
        locales: ['fr', 'ar'],
        fonts: 'same Fontsource fonts, local for Latin; reference Arabic face',
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
