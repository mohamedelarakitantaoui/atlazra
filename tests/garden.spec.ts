import { expect, test, type Page } from '@playwright/test';
import type { GardenScene } from '../src/components/garden/scene';
import { t } from '../src/i18n/content';
import {
  HARDWARE_GPU,
  SOFTWARE_GPU,
  disableFrameGuard,
  reportRenderer,
} from './renderer';

type ModelElement = HTMLElement & {
  diagnostics: ReturnType<GardenScene['snapshot']>;
};
const snapshot = (page: Page) =>
  page
    .locator('garden-model')
    .evaluate((el) => (el as ModelElement).diagnostics);
const ready = (page: Page) =>
  expect(page.locator('garden-model')).toHaveAttribute('data-status', 'ready', {
    timeout: 30000,
  });
const settled = (page: Page) =>
  expect
    .poll(async () => (await snapshot(page)).moving, { timeout: 15000 })
    .toBe(false);
const isScene = (url: string) => /\/scene[.\-/]|\/three[.\-/]/.test(url);

// A later reportRenderer() call in a test wraps this one and takes precedence.
test.beforeEach(async ({ page }) => {
  await reportRenderer(page, HARDWARE_GPU);
  await disableFrameGuard(page);
});

test('garden is viewport-lazy, has a poster, and enables controls only after rendering', async ({
  page,
}) => {
  // On the dev server Vite transforms three.js on first request, after load + idle.
  test.setTimeout(60000);
  const sceneRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (isScene(request.url())) sceneRequests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  // Make the actual hero off-screen before the module is evaluated.
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.head) return;
      const style = document.createElement('style');
      style.textContent = '#hero {margin-top:2000px}';
      document.head.append(style);
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto('/fr/', { waitUntil: 'networkidle' });
  await expect(page.locator('garden-model')).toHaveAttribute(
    'data-status',
    'waiting',
  );
  expect(sceneRequests).toEqual([]);
  const poster = page.locator('garden-model .poster');
  await expect(poster).toHaveCSS('opacity', '1');
  expect(
    await poster.evaluate((el) => (el as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(1000);
  for (const button of await page.locator('garden-model button').all())
    await expect(button).toBeDisabled();
  await page.locator('garden-model').scrollIntoViewIfNeeded();
  await ready(page);
  expect(sceneRequests.length).toBeGreaterThan(0);
  // The import waits for the page's own load event, then an idle period.
  const timing = await page.evaluate(() => ({
    load: performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming,
    scene: performance
      .getEntriesByType('resource')
      .filter((entry) => /\/scene[.\-/]/.test(entry.name))
      .map((entry) => entry.startTime),
  }));
  expect(timing.scene.length).toBeGreaterThan(0);
  for (const start of timing.scene)
    expect(start).toBeGreaterThanOrEqual(timing.load.loadEventEnd);
  await expect(page.locator('garden-model canvas')).toHaveCSS('opacity', '1');
  await expect(poster).toHaveCSS('opacity', '0');
  await page
    .getByRole('button', { name: t('fr', 'garden.current'), exact: true })
    .click();
  await expect(
    page.locator('garden-model [data-value="current"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', { name: t('fr', 'garden.project'), exact: true })
    .click();
  await expect(
    page.locator('garden-model [data-value="project"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  await settled(page);
  expect((await snapshot(page)).state).toBe('project');
  expect(errors).toEqual([]);
});

for (const locale of ['fr', 'ar'] as const) {
  test(`garden reduced motion, mirrored keyboard and 360px layout ${locale}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 360, height: 900 });
    await page.goto(`/${locale}/`);
    await ready(page);
    expect((await snapshot(page)).moving).toBe(false);
    // The click and observation share one task: no spring frame can intervene.
    for (const value of ['current', 'project']) {
      const result = await page
        .locator('garden-model')
        .evaluate((el, state) => {
          el.querySelector<HTMLButtonElement>(
            `[data-value="${state}"]`,
          )!.click();
          return (el as ModelElement).diagnostics;
        }, value);
      expect(result.state).toBe(value);
      expect(result.moving).toBe(false);
      expect(result.values.every((value) => value === 0 || value === 1)).toBe(
        true,
      );
    }
    const before = await snapshot(page);
    await page.locator('garden-model .surface').focus();
    await page.keyboard.press('ArrowRight');
    expect((await snapshot(page)).yaw - before.yaw).toBeCloseTo(
      locale === 'ar' ? -0.12 : 0.12,
    );
    await page.keyboard.press('ArrowLeft');
    expect((await snapshot(page)).yaw).toBeCloseTo(before.yaw);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const surface = page.locator('garden-model .surface');
    await surface.scrollIntoViewIfNeeded();
    const box = (await surface.boundingBox())!;
    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });
    await page.mouse.up();
    const released = await snapshot(page);
    await page.waitForTimeout(150);
    expect((await snapshot(page)).yaw).toBe(released.yaw);
    expect((await snapshot(page)).moving).toBe(false);
  });
}

test('garden tracks the pointer, carries momentum, stops when idle, pauses and disposes', async ({
  page,
}) => {
  // Two load-and-idle starts on SwiftShader; the phone-sized canvas keeps each
  // synchronous drag render short enough for the 100 ms release window.
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fr/');
  await ready(page);
  await settled(page);
  const surface = page.locator('garden-model .surface');
  const box = (await surface.boundingBox())!;
  const before = await snapshot(page);
  await page.mouse.move(box.x + 100, box.y + 150);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 150, { steps: 10 });
  expect((await snapshot(page)).yaw - before.yaw).toBeCloseTo(100 * 0.0085);
  await page.mouse.up();
  const released = (await snapshot(page)).yaw;
  await expect
    .poll(async () => (await snapshot(page)).yaw)
    .toBeGreaterThan(released);
  await page.mouse.down();
  const interrupted = (await snapshot(page)).yaw;
  await page.waitForTimeout(150);
  expect((await snapshot(page)).yaw).toBe(interrupted);
  await page.mouse.up();
  await settled(page);
  const idle = (await snapshot(page)).frames;
  await page.waitForTimeout(200);
  expect((await snapshot(page)).frames).toBe(idle);
  await page.locator('[data-value="current"]').click();
  // Exercise the hidden-page lifecycle deterministically in headless Chromium.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = (await snapshot(page)).frames;
  await page.waitForTimeout(200);
  expect((await snapshot(page)).frames).toBe(hidden);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await settled(page);
  await page.evaluate(() =>
    document.dispatchEvent(new Event('astro:before-swap')),
  );
  expect((await snapshot(page)).disposed).toBe(true);
  const disposedFrames = (await snapshot(page)).frames;
  await surface.press('ArrowLeft');
  await page.setViewportSize({ width: 900, height: 800 });
  await page.waitForTimeout(150);
  expect((await snapshot(page)).frames).toBe(disposedFrames);
  // Reconnecting the same island gets a fresh context and retains its selection.
  await page.evaluate(() => {
    const model = document.querySelector('garden-model')!;
    const parent = model.parentElement!;
    model.remove();
    parent.append(model);
  });
  await ready(page);
  await settled(page);
  expect((await snapshot(page)).disposed).toBe(false);
  expect((await snapshot(page)).state).toBe('current');
});

test('no WebGL keeps the poster and localized fallback with disabled controls', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith('webgl') || type === 'experimental-webgl')
        return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/ar/');
  await expect(page.locator('garden-model')).toHaveAttribute(
    'data-status',
    'fallback',
  );
  await expect(page.locator('garden-model .fallback')).toHaveText(
    t('ar', 'garden.fallback'),
  );
  await expect(page.locator('garden-model .poster')).toHaveCSS('opacity', '1');
  for (const button of await page.locator('garden-model button').all())
    await expect(button).toBeDisabled();
});

test('a software renderer keeps the poster and never requests three.js', async ({
  page,
}) => {
  await reportRenderer(page, SOFTWARE_GPU);
  const sceneRequests: string[] = [];
  const messages: string[] = [];
  page.on('request', (request) => {
    if (isScene(request.url())) sceneRequests.push(request.url());
  });
  page.on('console', (message) => {
    if (['error', 'warning', 'info'].includes(message.type()))
      messages.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => messages.push(error.message));
  await page.goto('/fr/', { waitUntil: 'networkidle' });
  await expect(page.locator('garden-model')).toHaveAttribute(
    'data-status',
    'poster',
  );
  await expect(page.locator('garden-model .poster')).toHaveCSS('opacity', '1');
  await expect(page.locator('garden-model canvas')).toHaveCSS('opacity', '0');
  await expect(page.locator('garden-model .fallback')).toBeHidden();
  await expect(page.locator('garden-model .surface')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  for (const button of await page.locator('garden-model button').all())
    await expect(button).toBeDisabled();
  await page.waitForTimeout(500);
  expect(sceneRequests).toEqual([]);
  expect(messages).toEqual([]);
});

test('slow intro frames hand back to the poster and dispose the scene', async ({
  page,
}) => {
  // Every animation frame arrives 60 ms late: a weak GPU on a capable driver.
  await page.addInitScript(() => {
    // Runs after beforeEach's listener: restore the default 40 ms budget.
    document.addEventListener('DOMContentLoaded', () =>
      document
        .querySelector('garden-model')!
        .removeAttribute('data-slow-frame-ms'),
    );
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(performance.now()), 60);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });
  const messages: { type: string; text: string }[] = [];
  page.on('console', (message) =>
    messages.push({ type: message.type(), text: message.text() }),
  );
  page.on('pageerror', (error) =>
    messages.push({ type: 'pageerror', text: error.message }),
  );
  await page.goto('/fr/');
  await expect(page.locator('garden-model')).toHaveAttribute(
    'data-status',
    'poster',
    { timeout: 30000 },
  );
  await expect(page.locator('garden-model .poster')).toHaveCSS('opacity', '1');
  await expect(page.locator('garden-model canvas')).toHaveCSS('opacity', '0');
  await expect(page.locator('garden-model .fallback')).toBeHidden();
  await expect.poll(async () => (await snapshot(page)).disposed).toBe(true);
  const { introMedianMs } = await snapshot(page);
  expect(introMedianMs).toBeGreaterThan(40);
  for (const button of await page.locator('garden-model button').all())
    await expect(button).toBeDisabled();
  const garden = messages.filter((m) => m.text.startsWith('Atlazra garden'));
  expect(garden).toHaveLength(1);
  expect(garden[0].type).toBe('info');
  // three.js and the GL driver may warn in headless Chromium; the island never errors.
  expect(
    messages.filter((m) => ['error', 'pageerror'].includes(m.type)),
  ).toEqual([]);
});

for (const locale of ['fr', 'ar'] as const)
  for (const width of [390, 1440]) {
    test(`capture garden ${locale} ${width} both states`, async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/${locale}/`);
      await ready(page);
      await settled(page);
      await page.evaluate(() => document.fonts.ready);
      for (const state of ['current', 'project']) {
        await page.locator(`garden-model [data-value="${state}"]`).click();
        await settled(page);
        await page.evaluate(() => scrollTo(0, 0));
        const path = info.outputPath(`home-${locale}-${width}-${state}.png`);
        await page.screenshot({
          path,
          fullPage: true,
          animations: 'disabled',
          style: 'astro-dev-toolbar { display: none !important; }',
        });
        await info.attach(`${locale}-${width}-${state}`, {
          path,
          contentType: 'image/png',
        });
      }
      await expect(
        page.locator('[data-language-switch] a[lang="ar"]'),
      ).toHaveCSS('font-family', /IBM Plex Sans Arabic/);
      await expect(
        page.locator('[data-language-switch] a[lang="ar"]'),
      ).toHaveCSS('font-size', '18px');
      expect(errors).toEqual([]);
    });
  }
