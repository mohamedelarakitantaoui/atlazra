import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { serveBuilt } from './serve-built.ts';
import { HARDWARE_GPU, reportRenderer } from '../tests/renderer.ts';
import { POSTER_WIDTHS } from '../src/components/garden/poster.ts';

const SOURCE_WIDTH = Math.max(...POSTER_WIDTHS);

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
  await page.route(/\/garden-(?:current-)?poster-.*\.webp/, (route) =>
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
  // Render once into a 1080 px slot (2160 px at DPR 2, the renderer's cap); the
  // camera depends only on the 5:4 aspect, so framing matches the real slot.
  await page.addStyleTag({
    content: `garden-model .poster, garden-model .hint, garden-model .model-control { visibility: hidden !important; }
      garden-model { position: fixed !important; inset: 0 auto auto 0 !important; width: ${SOURCE_WIDTH / 2}px !important; height:${SOURCE_WIDTH * 0.4}px !important; z-index: 99; }
      garden-model .stage { max-width: none !important; height:100% !important; aspect-ratio:5/4 !important; }
      garden-model .surface { inset:0 !important; aspect-ratio:auto !important; }`,
  });
  const canvas = page.locator('garden-model canvas');
  await expect(canvas).toHaveJSProperty('width', SOURCE_WIDTH);
  // Draw and encode in the same browser task; preserveDrawingBuffer stays off
  // during normal interactive use. Opposite key presses preserve the default yaw.
  const posters = [];
  for (const state of ['project', 'current'] as const) {
    await page
      .locator(`garden-model button[data-value="${state}"]`)
      .evaluate((button) => (button as HTMLButtonElement).click());
    const results = await canvas.evaluate(
      (element, widths) => {
        const rendered = element as HTMLCanvasElement;
        const surface = element.parentElement!;
        surface.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight' }),
        );
        surface.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowLeft' }),
        );
        return widths.map((width) => {
          const height = Math.round((width * rendered.height) / rendered.width);
          const scaled = document.createElement('canvas');
          Object.assign(scaled, { width, height });
          const context = scaled.getContext('2d')!;
          context.imageSmoothingQuality = 'high';
          context.drawImage(rendered, 0, 0, width, height);
          return { width, height, data: scaled.toDataURL('image/webp', 0.8) };
        });
      },
      [...POSTER_WIDTHS],
    );
    for (const { width, height, data } of results) {
      const image = Buffer.from(data.split(',')[1], 'base64');
      const prefix =
        state === 'current' ? 'garden-current-poster' : 'garden-poster';
      await writeFile(`public/${prefix}-${width}.webp`, image);
      posters.push({ state, width, height, bytes: image.length });
    }
  }
  console.log(
    JSON.stringify(
      { posters, state: 'project', source: SOURCE_WIDTH },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.close();
}
