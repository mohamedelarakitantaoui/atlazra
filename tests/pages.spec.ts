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
        await expect(page.locator('main .placeholder')).toHaveText(
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
