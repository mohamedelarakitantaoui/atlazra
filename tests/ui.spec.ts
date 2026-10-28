import { expect, test } from '@playwright/test';

for (const locale of ['fr', 'ar'] as const) {
  const url = `/${locale}/dev/ui/`;

  for (const width of [390, 1440]) {
    test(`ui-${locale}-${width}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(url);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow',
      );
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        locale === 'ar' ? 'rtl' : 'ltr',
      );
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(
        page.getByRole('img', { name: 'Atlazra Design' }),
      ).toHaveCount(3);
      await expect(page.locator('ui-segmented')).toHaveAttribute(
        'data-ready',
        'true',
      );
      await page.evaluate(() => document.fonts.ready);
      const nameHeight = (await page.locator('#demo-name').boundingBox())!
        .height;
      const phoneHeight = (await page.locator('#demo-phone').boundingBox())!
        .height;
      expect(nameHeight).toBeGreaterThanOrEqual(48);
      expect(phoneHeight).toBeGreaterThanOrEqual(48);
      expect(Math.abs(nameHeight - phoneHeight)).toBeLessThan(1);
      await expect(page.locator('#demo-phone')).toHaveAttribute('dir', 'ltr');
      if (locale === 'ar')
        await expect(page.locator('#demo-phone')).toHaveCSS(
          'text-align',
          'end',
        );
      await expect(page.locator('body')).toHaveCSS('overflow-x', 'clip');
      await expect(page.locator('#demo-message')).toHaveValue('');
      await expect(page.locator('#demo-message')).toHaveAttribute(
        'placeholder',
        /Surface|المساحة/,
      );
      await expect(page.locator('#demo-phone-error')).toHaveCSS(
        'color',
        'rgb(179, 38, 30)',
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const button of await page
        .locator('ui-segmented button, .btn')
        .all()) {
        expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      }
      const path = testInfo.outputPath(`ui-${locale}-${width}.png`);
      await page.screenshot({
        path,
        fullPage: true,
        animations: 'disabled',
        style: 'astro-dev-toolbar { display: none !important; }',
      });
      await testInfo.attach(`ui-${locale}-${width}`, {
        path,
        contentType: 'image/png',
      });
    });
  }

  test(`ui-${locale}-interaction`, async ({ page }) => {
    await page.goto(url);
    const control = page.getByRole('radiogroup');
    const choices = control.getByRole('radio');
    await expect(control).toHaveAttribute('data-ready', 'true');
    await expect(choices.nth(1)).toBeChecked();
    await page.evaluate(() => document.fonts.ready);
    await choices.nth(0).scrollIntoViewIfNeeded();
    // Feedback occurs on pointer press, before release.
    const box = await choices.nth(0).boundingBox();
    if (!box) throw new Error('Segment button is missing');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(choices.nth(0)).toBeChecked();
    await page.mouse.up();
    await choices.nth(0).focus();
    await page.keyboard.press('End');
    await expect(choices.nth(1)).toBeFocused();
    await expect(choices.nth(1)).toBeChecked();
    await page.keyboard.press('Home');
    await expect(choices.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(choices.nth(1)).toBeFocused();
    await expect(choices.nth(1)).toBeChecked();
    // The thumb follows the selected item after layout and RTL positioning.
    await expect
      .poll(async () => {
        const thumb = await control.locator('.thumb').boundingBox();
        const selected = await choices.nth(1).boundingBox();
        return thumb && selected
          ? Math.abs(thumb.x - selected.x) +
              Math.abs(thumb.width - selected.width)
          : Infinity;
      })
      .toBeLessThan(2);

    const trigger = page.locator('#design-trigger');
    const panel = page.locator('#design-panel');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toHaveAttribute('inert', '');
    await page.keyboard.press('Tab');
    await expect(page.locator('#materials-trigger')).toBeFocused();
    await trigger.focus();
    await page.keyboard.press('Space');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).not.toHaveAttribute('inert');
    await page.keyboard.press('Tab');
    await expect(panel.getByRole('link')).toBeFocused();

    const phone = page.locator('#demo-phone');
    await expect(phone).toHaveAttribute('aria-invalid', 'true');
    await expect(phone).toHaveAttribute('aria-describedby', 'demo-phone-error');
    await expect(phone).toHaveAccessibleDescription(
      locale === 'ar'
        ? 'أدخل رقم هاتف يمكننا الاتصال به.'
        : 'Indiquez un numéro où vous joindre.',
    );
    await expect(phone).toHaveAccessibleName(/Téléphone|الهاتف/);
    await page.locator('#demo-name').fill('Atlazra');
    await page.locator('#demo-message').fill('Test');
    await expect(page.locator('#demo-name')).toHaveValue('Atlazra');
    await expect(page.locator('#demo-message')).toHaveValue('Test');

    // Static tags never enter the tab order; native radio chips support keyboard selection.
    for (const chip of await page.locator('.chip').all()) {
      expect(
        await chip.evaluate((element) => (element as HTMLElement).tabIndex),
      ).toBe(-1);
    }
    const villaChip = page.locator('#choice-villa');
    const planChip = page.locator('#choice-plan');
    await expect(villaChip).toBeChecked();
    await villaChip.focus();
    await expect(page.locator('label[for="choice-villa"]')).toHaveCSS(
      'outline-style',
      'solid',
    );
    await page.keyboard.press('ArrowRight');
    await expect(planChip).toBeChecked();
    await expect(villaChip).not.toBeChecked();
    await expect(page.locator('label[for="choice-plan"]')).toHaveCSS(
      'background-color',
      'rgb(18, 61, 44)',
    );
  });
}

test('ui respects reduced motion and remains within 360px', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/ar/dev/ui/');
  await expect(page.locator('ui-segmented')).toHaveAttribute(
    'data-ready',
    'true',
  );
  const duration = await page
    .locator('ui-segmented .thumb')
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(parseFloat(duration)).toBeLessThan(0.001);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('unprefixed showcase route is removed', async ({ request }) => {
  expect((await request.get('/dev/ui/')).status()).toBe(404);
});
