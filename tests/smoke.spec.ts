import { expect, test } from '@playwright/test';

test('French homepage shows the company tagline', async ({
  page,
}, testInfo) => {
  await page.goto('/fr/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Votre jardin dessiné en 3D, avant le premier coup de pelle.',
  );

  for (const locale of ['fr', 'ar']) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/${locale}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        locale === 'ar' ? 'rtl' : 'ltr',
      );
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const name = `${locale}-${width}.png`;
      const path = testInfo.outputPath(name);
      await page.screenshot({ path, fullPage: true });
      await testInfo.attach(name, { path, contentType: 'image/png' });
    }
  }
});
