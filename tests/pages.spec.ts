import { expect, test } from '@playwright/test';
import { locales } from '../src/i18n/routing';
import { t } from '../src/i18n/content';

const routes = {
  services: 'services',
  realisations: 'realisations',
  'mentions-legales': 'legal',
  confidentialite: 'privacy',
} as const;
for (const locale of locales) {
  for (const [route, section] of Object.entries(routes)) {
    test(`${locale}-${route} shell`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      const response = await page.goto(`/${locale}/${route}/`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        t(locale, `pages.${section}.title`),
      );
      if (section === 'legal' || section === 'privacy') {
        // Visitors see a neutral placeholder; the TODO stays in markup.
        const placeholder = page.locator('main .placeholder');
        await expect(placeholder).toHaveText(t(locale, 'contact.pending'));
        await expect(placeholder).toHaveAttribute(
          'data-client-todo',
          t(locale, `pages.${section}.todo`),
        );
      }
      for (const path of ['services', 'realisations', 'contact']) {
        await expect(
          page.locator(`.main-nav a[href="/${locale}/${path}/"]`),
        ).toHaveCount(1);
      }
      for (const path of ['mentions-legales', 'confidentialite']) {
        await expect(
          page.locator(`footer a[href="/${locale}/${path}/"]`),
        ).toBeVisible();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
}

for (const locale of locales) {
  test(`services page lists every service open ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}/services/`);
    const titles = page.locator('.services h2');
    await expect(titles).toHaveText(
      (['a1', 'a2', 'a3'] as const).map((key) =>
        t(locale, `home.reference.${key}`),
      ),
    );
    await expect(page.locator('.services .chips li')).toHaveCount(9);
    await expect(page.locator('.services')).toHaveAttribute(
      'data-client-todo',
      t(locale, 'home.todos.services'),
    );
    await expect(page.locator('main a.btn')).toHaveAttribute(
      'href',
      `/${locale}/contact/`,
    );
  });
}

test('header marks the current section, including nested pages', async ({
  page,
}) => {
  await page.goto('/fr/services/');
  const nav = page.locator('.main-nav');
  await expect(nav.locator('[aria-current="page"]')).toHaveAttribute(
    'href',
    '/fr/services/',
  );
  await page.goto('/ar/contact/merci/');
  await expect(nav.locator('[aria-current="page"]')).toHaveAttribute(
    'href',
    '/ar/contact/',
  );
  await page.goto('/fr/');
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
});

test('skip link is first in tab order and moves focus to main', async ({
  page,
}) => {
  await page.goto('/ar/services/');
  await page.keyboard.press('Tab');
  const skip = page.locator('a.skip');
  await expect(skip).toBeFocused();
  await expect(skip).toHaveText(t('ar', 'nav.skip'));
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('404 offers working localized home links and the brand mark', async ({
  page,
}) => {
  const response = await page.goto('/missing-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    t('fr', 'pages.notFound.title'),
  );
  await expect(page.locator('main .logo-mark svg')).toBeVisible();
  for (const locale of locales) {
    await expect(page.locator(`main a[href="/${locale}/"]`)).toBeVisible();
    await expect(
      page.locator(`[data-language-switch] a[lang="${locale}"]`),
    ).toHaveAttribute('href', `/${locale}/`);
  }
});

for (const [locale, route] of [
  ['fr', 'services'],
  ['ar', 'realisations'],
] as const) {
  test(`capture-${locale}-${route}-390`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto(`/${locale}/${route}/`);
    await page.evaluate(() => document.fonts.ready);
    const path = testInfo.outputPath(`${locale}-${route}-390.png`);
    await page.screenshot({
      path,
      fullPage: true,
      animations: 'disabled',
    });
    await testInfo.attach(`${locale}-${route}-390`, {
      path,
      contentType: 'image/png',
    });
  });
}
