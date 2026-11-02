import { expect, test } from '@playwright/test';
import { locales } from '../src/i18n/routing';
import { t } from '../src/i18n/content';
import { callouts, formatCallout } from '../src/components/garden/plan';

for (const locale of locales) {
  test(`home sections and interactions ${locale}`, async ({
    page,
    request,
  }) => {
    const ids = [
      'hero',
      'plan',
      'services',
      'palette',
      'etapes',
      'projets',
      'contact',
    ];
    const html = await (await request.get(`/${locale}/`)).text();
    for (const id of ids) expect(html).toContain(`id="${id}"`);
    expect(html).toContain(t(locale, 'redesign.h1'));
    expect(html).not.toContain('base64,');
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`/${locale}/`);
    await expect(page.locator('main > section')).toHaveCount(9);
    for (const [id, key] of [
      ['hero', 'h1'],
      ['plan', 'ph'],
      ['services', 'sh'],
      ['palette', 'vh'],
      ['etapes', 'mh'],
      ['projets', 'rh'],
      ['contact', 'kh'],
    ] as const)
      await expect(
        page.locator(`#${id}`).getByRole('heading').first(),
      ).toHaveText(t(locale, `redesign.${key}`));
    await expect(page.locator('.giant .word')).toHaveCSS('direction', 'ltr');
    await expect(page.locator('garden-model .stage')).toHaveCSS(
      'direction',
      'ltr',
    );
    await expect(page.locator('#services .rows > li')).toHaveCount(3);
    await expect(page.locator('#palette .tag')).toHaveCount(6);
    await expect(page.locator('#palette [data-client-todo]')).toHaveAttribute(
      'data-client-todo',
      t(locale, 'redesign.plantsTodo'),
    );
    await expect(page.locator('#etapes .pages > li')).toHaveCount(4);
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
    const details = page.locator('.faq details');
    await expect(details).toHaveCount(4);
    await details.first().locator('summary').click();
    await expect(details.first()).toHaveAttribute('open', '');
    await expect(details.last().locator('[data-client-todo]')).toHaveCount(1);
    for (const width of [360, 390, 768, 860, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
  test(`plan pins and real config dimensions ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    await expect(page.locator('.pin')).toHaveCount(7);
    for (const [i, { key, values }] of callouts.entries()) {
      const row = page.locator(`#callouts [data-k="${key}"] button`);
      const pin = page.locator(`.pin[data-k="${key}"]`);
      await row.focus();
      await expect(pin).toHaveAttribute('aria-pressed', 'true');
      await expect(row.locator('.d')).toHaveText(
        formatCallout(
          t(locale, `redesign.c${i + 1}d` as Parameters<typeof t>[1]),
          values,
          locale,
        ),
      );
      await pin.click();
      await expect(row).toHaveAttribute('aria-pressed', 'true');
      await pin.focus();
      await expect(pin).toBeFocused();
    }
    await page.locator('.pin[data-k="pool"]').hover();
    await expect(page.locator('#callouts [data-k="pool"]')).toHaveClass('on');
  });
  test(`comparison pointer and keyboard mirrored ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(`/${locale}/`);
    const input = page.locator('#split');
    const compare = page.locator('#compare');
    await input.focus();
    await page.keyboard.press('ArrowRight');
    await expect(input).toHaveValue(locale === 'ar' ? '49' : '51');
    await compare.scrollIntoViewIfNeeded();
    const box = (await compare.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5, {
      steps: 8,
    });
    await page.mouse.up();
    expect(Number(await input.inputValue())).toBeCloseTo(
      locale === 'ar' ? 25 : 75,
      0,
    );
    await expect(compare).toHaveCSS('--split', locale === 'ar' ? '25%' : '75%');
  });
}

test('marquee pauses and reduced motion keeps content usable', async ({
  page,
}) => {
  await page.goto('/fr/');
  const toggle = page.locator('.marquee-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.marquee .track')).toHaveCSS(
    'animation-play-state',
    'paused',
  );
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.marquee .track')).toHaveCSS('animation-play-state','running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.marquee .track')).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect(page.locator('#hero-title')).toBeVisible();
  await expect(page.locator('#palette .tag').first()).toBeVisible();
});

test('home content remains readable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/ar/');
  await expect(page.locator('h1')).toHaveText(t('ar', 'redesign.h1'));
  await expect(page.locator('#callouts li')).toHaveCount(7);
  await page.locator('.faq summary').first().click();
  await expect(page.locator('.faq details').first()).toHaveAttribute(
    'open',
    '',
  );
  await expect(page.locator('garden-model .poster')).toBeVisible();
  await context.close();
});

test('slow 3G shows the hero while JavaScript is still blocked', async ({
  page,
}) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: 50000,
    uploadThroughput: 50000,
  });
  await page.route('**/*.js', (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/fr/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toHaveText(t('fr', 'redesign.h1'));
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('garden-model .poster')).toBeVisible();
  await expect(page.locator('.left .btn').first()).toHaveAttribute(
    'href',
    '/fr/contact/',
  );
});
