import { expect, test, type Page } from '@playwright/test';

test('only Arabic pages preload the hero heading font', async ({ page }) => {
  await page.goto('/ar/');
  const preloads = page.locator('link[rel="preload"][as="font"]');
  await expect(preloads).toHaveCount(1);
  await expect(preloads).toHaveAttribute(
    'href',
    /ibm-plex-sans-arabic-arabic-600.*\.woff2$/,
  );
  await expect(preloads).toHaveAttribute('type', 'font/woff2');
  await expect(preloads).toHaveAttribute('crossorigin', '');
  await page.goto('/fr/');
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(0);
});

const heroBoxes = (page: Page) =>
  page.evaluate(() =>
    [
      '#hero-title',
      '.hero-copy > p',
      '.hero-copy .actions',
      'garden-model',
    ].map((selector) => {
      const box = document.querySelector(selector)!.getBoundingClientRect();
      return { selector, top: box.top, height: box.height };
    }),
  );

for (const width of [390, 1440]) {
  test(`Arabic hero keeps its layout when Plex replaces the fallback at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    // First pass: Plex never arrives, so the size-matched local fallback shows.
    await page.route('**/*.woff2', (route) => route.abort());
    await page.goto('/ar/');
    await page.evaluate(() => document.fonts.ready);
    const fallbackFaces = await page.evaluate(() =>
      [...document.fonts]
        .filter((face) => face.family.includes('Fallback'))
        .map((face) => face.status),
    );
    test.skip(
      !fallbackFaces.includes('loaded'),
      'Tahoma/Arial are not installed here; the tuned fallback cannot apply.',
    );
    const before = await heroBoxes(page);
    await page.unroute('**/*.woff2');
    await page.goto('/ar/');
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() =>
        document.fonts.check('600 40px "IBM Plex Sans Arabic"', 'فن'),
      ),
    ).toBe(true);
    const after = await heroBoxes(page);
    for (const [index, box] of after.entries()) {
      expect(
        Math.abs(box.top - before[index].top),
        `${box.selector} top`,
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(box.height - before[index].height),
        `${box.selector} height`,
      ).toBeLessThanOrEqual(2);
    }
  });
}
