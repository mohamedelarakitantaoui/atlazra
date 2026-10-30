import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { serveBuilt } from './serve-built.ts';
import { HARDWARE_GPU, reportRenderer } from '../tests/renderer.ts';

const server = await serveBuilt(4174);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  // Headless Chromium reports SwiftShader, which would otherwise keep the poster.
  await reportRenderer(page, HARDWARE_GPU);
  // Bootstrap generation also works before the poster exists.
  await page.route('**/garden-poster.webp', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="5" height="4"/>',
    }),
  );
  await page.goto(`${server.url}/fr/`);
  await page
    .locator('garden-model[data-status="ready"]')
    .waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content:
      'garden-model .poster, garden-model .hint, garden-model .model-control { visibility: hidden !important; }',
  });
  const canvas = page.locator('garden-model canvas');
  const slot = await canvas.boundingBox();
  if (!slot) throw new Error('Garden slot missing');
  // Draw and encode in the same browser task; preserveDrawingBuffer stays off
  // during normal interactive use. Opposite key presses preserve the default yaw.
  const result = await canvas.evaluate((element) => {
    const rendered = element as HTMLCanvasElement;
    const surface = element.parentElement!;
    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    return {
      width: rendered.width,
      height: rendered.height,
      data: rendered.toDataURL('image/webp', 0.8),
    };
  });
  const image = Buffer.from(result.data.split(',')[1], 'base64');
  await writeFile('public/garden-poster.webp', image);
  console.log(
    JSON.stringify(
      {
        slot,
        poster: {
          width: result.width,
          height: result.height,
          bytes: image.length,
        },
        state: 'project',
        deviceScaleFactor: 2,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.close();
}
