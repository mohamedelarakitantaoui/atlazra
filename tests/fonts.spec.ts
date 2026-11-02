import { expect, test, type Page } from '@playwright/test';

for (const locale of ['fr', 'en'])
  for (const width of [390, 1440]) {
    test(`${locale} requests no Arabic fonts at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const fonts: string[] = [];
      page.on('request', (request) => {
        if (/\.woff2(?:\?|$)/.test(request.url())) fonts.push(request.url());
      });
      for (const path of [`/${locale}/`, `/${locale}/contact/`]) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await expect(
          page.locator('[data-language-switch] a[lang="ar"]'),
        ).toHaveText('ع');
      }
      expect(fonts.some((url) => url.includes('ibm-plex-sans-arabic'))).toBe(
        false,
      );
      expect(fonts.some((url) => url.includes('manrope'))).toBe(true);
    });
  }

test('pages preload the critical display and locale heading fonts', async ({ page }) => {
  await page.goto('/ar/');
  const preloads = page.locator('link[rel="preload"][as="font"]');
  await expect(preloads).toHaveCount(2);
  await expect(page.locator('link[rel="preload"][as="font"][href*="ibm-plex-sans-arabic"]')).toHaveAttribute(
    'href',
    /ibm-plex-sans-arabic-arabic-600.*\.woff2$/,
  );
  for(const preload of await preloads.all()){
    await expect(preload).toHaveAttribute('type', 'font/woff2');
    await expect(preload).toHaveAttribute('crossorigin', '');
  }
  await page.goto('/fr/');
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(3);
});

const heroBoxes = (page: Page) =>
  page.evaluate(() =>
    ['#hero-title', '.hero-copy > p', '.hero-copy .ctas', 'garden-model'].map(
      (selector) => {
        const box = document.querySelector(selector)!.getBoundingClientRect();
        return { selector, top: box.top, height: box.height };
      },
    ),
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
