import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { locales, localizedPath } from '../src/i18n/routing';

const pages = ['', 'contact/', 'dev/ui/'];

for (const path of pages) {
  for (const locale of locales) {
    test(`switch-${locale}-${path || 'home'}`, async ({ page }) => {
      const original = `/${locale}/${path}`;
      await page.goto(`${original}?source=locale-test#top`);
      const switcher = page.locator('[data-language-switch]');
      await expect(switcher).toBeVisible();
      for (const target of locales) {
        const expected = localizedPath(
          `${original}?source=locale-test#top`,
          target,
        );
        const link = switcher.locator(`a[lang="${target}"]`);
        await expect(link).toHaveAttribute('href', expected);
        await link.click();
        await expect(page).toHaveURL(
          new RegExp(`/${target}/${path}\\?source=locale-test#top$`),
        );
        await expect(page.locator('html')).toHaveAttribute('lang', target);
        await expect(page.locator('html')).toHaveAttribute(
          'dir',
          target === 'ar' ? 'rtl' : 'ltr',
        );
      }
    });
  }
}

for (const locale of ['fr', 'ar'] as const) {
  for (const route of ['home', 'contact'] as const) {
    for (const width of [390, 1440]) {
      test(`${route}-${locale}-${width}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        const response = await page.goto(
          `/${locale}/${route === 'home' ? '' : 'contact/'}`,
        );
        expect(response?.status()).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        await expect(page.getByRole('banner')).toBeVisible();
        await expect(page.getByRole('contentinfo')).toBeVisible();
        if (locale === 'ar') {
          const copyright = page.getByRole('contentinfo').locator('.copyright');
          await expect(copyright).toHaveText(
            '© 2026 Atlazra Design · دار نزار، الرباط – سلا',
          );
          await expect(copyright.locator('bdi')).toHaveText('Atlazra Design');
          await expect(copyright.locator('bdi')).toHaveCSS('direction', 'ltr');
          await expect(copyright.locator('bdi')).toHaveCSS(
            'unicode-bidi',
            'isolate',
          );
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const path = testInfo.outputPath(`${route}-${locale}-${width}.png`);
        await page.screenshot({
          path,
          fullPage: true,
          animations: 'disabled',
          style: 'astro-dev-toolbar { display: none !important; }',
        });
        await testInfo.attach(`${route}-${locale}-${width}`, {
          path,
          contentType: 'image/png',
        });
      });
    }
  }

  test(`mobile-navigation-${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/${locale}/`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const menu = page.locator('.menu-btn');
    const nav = page.locator('.main-nav');
    await expect(nav).not.toBeVisible();
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(nav).not.toBeVisible();
    await expect(menu).toBeFocused();
    await menu.click();
    await nav.locator(`a[href="/${locale}/#services"]`).click();
    await expect(nav).not.toBeVisible();
    await expect(page.locator('#services')).toBeInViewport();
    await page.goto(`/${locale}/contact/`, { waitUntil: 'networkidle' });
    await expect(nav).not.toBeVisible();
  });
}

test('root negotiates Accept-Language while explicit URLs remain authoritative', async ({
  request,
}) => {
  for (const [header, target] of [
    ['', 'fr'],
    ['de-DE', 'fr'],
    ['ar-MA,fr;q=0.8,en;q=0.5', 'ar'],
    ['en-GB;q=0.9,ar;q=0.6,fr;q=0.2', 'en'],
    ['ar;q=0,en;q=0.8', 'en'],
    ['en;q=0.2,fr;q=0.9', 'fr'],
  ]) {
    const response = await request.get('/?source=redirect', {
      headers: { 'Accept-Language': header },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe(`/${target}/?source=redirect`);
    expect(response.headers().vary).toContain('Accept-Language');
    expect(response.headers()['cache-control']).toContain('no-store');
  }
  const response = await request.get('/fr/contact/', {
    headers: { 'Accept-Language': 'ar' },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(200);
});

test('every built page is covered; sitemap has locale alternatives and excludes all dev pages', async () => {
  const expected = pages
    .flatMap((path) => locales.map((locale) => `${locale}/${path}index.html`))
    .sort();
  const built = (await readdir('.vercel/output/static', { recursive: true }))
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => /^(fr|ar|en)\/.*index\.html$/.test(path))
    .sort();
  expect(built).toEqual(expected);
  const xml = await readFile(
    join('.vercel/output/static', 'sitemap-0.xml'),
    'utf8',
  );
  expect(xml).not.toContain('/dev/');
  for (const locale of locales) {
    expect(xml).toContain(`/${locale}/contact/`);
    expect(xml).toContain(`hreflang="${locale}"`);
  }
  const output = JSON.parse(
    await readFile('.vercel/output/config.json', 'utf8'),
  );
  expect(JSON.stringify(output)).toContain('_middleware');
  const edge = JSON.parse(
    await readFile(
      '.vercel/output/functions/_middleware.func/.vc-config.json',
      'utf8',
    ),
  );
  expect(edge.runtime).toBe('edge');
});
