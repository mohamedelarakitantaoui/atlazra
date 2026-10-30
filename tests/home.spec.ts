import { expect, test } from '@playwright/test';
import { locales } from '../src/i18n/routing';
import { t } from '../src/i18n/content';
import { HARDWARE_GPU, disableFrameGuard, reportRenderer } from './renderer';

test.beforeEach(async ({ page }) => {
  await reportRenderer(page, HARDWARE_GPU);
  await disableFrameGuard(page);
});

for (const locale of locales) {
  test(`home sections and interactions ${locale}`, async ({
    page,
    request,
  }) => {
    // All copy and sections must also be present before client JavaScript runs.
    const html = await (await request.get(`/${locale}/`)).text();
    for (const id of ['hero', 'services', 'etapes', 'projets', 'contact']) {
      expect(html).toContain(`id="${id}"`);
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${locale}/`);
    await expect(page.locator('main > section')).toHaveCount(5);
    for (const [id, key] of [
      ['hero', 'h1'],
      ['services', 'sh'],
      ['etapes', 'eh'],
      ['projets', 'ph'],
      ['contact', 'ch'],
    ] as const) {
      await expect(
        page.locator(`#${id}`).getByRole('heading').first(),
      ).toHaveText(t(locale, `home.reference.${key}`));
    }
    const rows = page.locator('#services ui-accordion');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).getByRole('button')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(rows.nth(1).getByRole('button')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await rows.nth(1).getByRole('button').click();
    await expect(rows.nth(1).getByRole('region')).toBeVisible();
    await expect(rows.nth(1).locator('.chip')).toHaveCount(3);
    await expect(page.locator('garden-model .stage')).toHaveCSS(
      'direction',
      'ltr',
    );
    await expect(page.locator('garden-model')).toHaveAttribute(
      'data-status',
      'ready',
      { timeout: 30000 },
    );
    for (const button of await page.locator('garden-model button').all())
      await expect(button).toBeEnabled();
    await expect(page.locator('garden-model canvas')).toHaveCount(1);
    await expect(page.locator('#projets .pending')).toHaveCount(1);
    await expect(page.locator('#projets li')).toHaveCount(4);
    await expect(page.locator('#contact .btn')).toHaveAttribute(
      'href',
      `/${locale}/contact/`,
    );
    await expect(page.locator('#contact a.link')).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/6f43CHxzyrMHoT4f9',
    );
    await expect(page.locator('#contact .todo')).toHaveCount(2);
    await expect(page.locator('#prev')).toBeDisabled();
    const { stride, max } = await page.locator('#track').evaluate((el) => ({
      stride: el.querySelector('.step')!.getBoundingClientRect().width + 16,
      max: el.scrollWidth - el.clientWidth,
    }));
    for (let index = 0; index < 3; index++) {
      await page.locator('#next').click();
      await expect
        .poll(async () =>
          Math.abs(
            (await page
              .locator('#track')
              .evaluate((el) => Math.abs(el.scrollLeft))) -
              Math.min((index + 1) * stride, max),
          ),
        )
        .toBeLessThan(2);
    }
    await expect(page.locator('#next')).toBeDisabled();
    const offset = await page.locator('#track').evaluate((el) => el.scrollLeft);
    expect(locale === 'ar' ? offset < 0 : offset > 0).toBe(true);
    for (let index = 0; index < 3; index++) {
      await page.locator('#prev').click();
      await expect
        .poll(async () =>
          Math.abs(
            (await page
              .locator('#track')
              .evaluate((el) => Math.abs(el.scrollLeft))) -
              Math.max(0, (2 - index) * stride),
          ),
        )
        .toBeLessThan(2);
    }
    await expect(page.locator('#prev')).toBeDisabled();
    for (const width of [360, 859, 860, 861, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('.svc-grid .sec-head')).toHaveCSS(
        'position',
        width <= 860 ? 'static' : 'sticky',
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}
