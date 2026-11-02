import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { locales } from '../src/i18n/routing';
import { t } from '../src/i18n/content';

const examples = process.env.PROJECT_EXAMPLES === '1';
test('draft originals are absent from the production asset imports', async () => {
  test.skip(examples, 'Only applicable to the final draft-only build.');
  expect(await readFile('.astro/content-assets.mjs', 'utf8')).not.toContain(
    'exemple-',
  );
  expect(
    (await readdir('.vercel/output/static/_astro')).filter((path) =>
      /^image-[0-7]\./.test(path),
    ),
  ).toEqual([]);
});
for (const locale of locales) {
  test(`projects publication and server content ${locale}`, async ({
    page,
    request,
  }) => {
    await page.goto(`/${locale}/realisations/`);
    if (!examples) {
      await expect(page.locator('[data-project-type]')).toHaveCount(0);
      await expect(page.locator('main .placeholder')).toHaveText(
        t(locale, 'home.reference.pend'),
      );
      for (const slug of ['exemple-villa', 'exemple-terrasse', '_template'])
        expect(
          (await request.get(`/${locale}/realisations/${slug}/`)).status(),
        ).toBe(404);
      expect(await (await request.get('/sitemap-0.xml')).text()).not.toContain(
        'exemple-',
      );
      return;
    }
    await expect(page.locator('[data-project-type]')).toHaveCount(2);
    const html = await (
      await request.get(`/${locale}/realisations/exemple-villa/`)
    ).text();
    expect(html).toContain('application/ld+json');
    expect(html).toContain('CreativeWork');
    expect(html).toContain(t(locale, 'projects.chapters.before'));
    for (const slug of ['exemple-villa', 'exemple-terrasse']) {
      await page.goto(`/${locale}/realisations/${slug}/`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.locator('[data-chapter]')).toHaveCount(
        slug === 'exemple-villa' ? 4 : 3,
      );
      await expect(page.locator('plan-hotspots')).toHaveCount(
        slug === 'exemple-villa' ? 1 : 0,
      );
      await expect(page.locator('before-after')).toHaveCount(
        slug === 'exemple-villa' ? 1 : 0,
      );
      const json = JSON.parse(
        (await page
          .locator('script[type="application/ld+json"]')
          .textContent()) ?? '{}',
      );
      expect(json.inLanguage).toBe(locale);
      expect(json.image.length).toBe(slug === 'exemple-villa' ? 8 : 4);
      for (const image of await page.locator('main img').all()) {
        expect(await image.getAttribute('alt')).toBeTruthy();
        expect(Number(await image.getAttribute('width'))).toBeGreaterThan(0);
        expect(Number(await image.getAttribute('height'))).toBeGreaterThan(0);
      }
      for (const width of [360, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
      await page
        .locator(
          `[data-language-switch] a[lang="${locale === 'fr' ? 'ar' : 'fr'}"]`,
        )
        .click();
      await expect(page).toHaveURL(new RegExp(`/realisations/${slug}/$`));
    }
    await page.goto(`/${locale}/`);
    await expect(page.locator('#projets [data-project-type]')).toHaveCount(2);
    await expect(page.locator('#projets .pending')).toHaveCount(0);
    // Card titles sit under the section h2; two cards pair up, none spans.
    await expect(page.locator('#projets article h3')).toHaveCount(2);
    await expect(page.locator('#projets .project-grid')).not.toHaveClass(
      /featured/,
    );
  });
}

test.describe('published examples', () => {
  test.skip(
    !examples,
    'Run scripts/verify-project-examples.mjs to build the temporary local fixtures.',
  );
  test('type filters preserve hash and history, offering only used types', async ({
    page,
  }) => {
    await page.goto('/fr/realisations/#terrasse');
    await expect(page.locator('[data-project-type]:visible')).toHaveCount(1);
    await expect(page.locator('[data-filter="terrasse"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Only types with projects are offered, so no filter leads nowhere.
    await expect(page.locator('[data-filter]')).toHaveCount(3);
    await expect(page.locator('[data-filter="riad"]')).toHaveCount(0);
    await page.locator('[data-filter="villa"]').click();
    await expect(page).toHaveURL(/#villa$/);
    await expect(page.locator('[data-project-type]:visible')).toHaveCount(1);
    await page.goBack();
    await expect(page.locator('[data-filter="terrasse"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.locator('[data-filter="all"]').click();
    await expect(page.locator('[data-project-type]:visible')).toHaveCount(2);
    // A stale link to a type with no projects falls back to all.
    await page.goto('/fr/realisations/#riad');
    await expect(page.locator('[data-filter="all"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('.empty')).toBeHidden();
  });
  for (const locale of ['fr', 'ar'] as const) {
    test(`comparison, hotspots and lightbox ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${locale}/realisations/exemple-villa/`);
      const slider = page.getByRole('slider');
      await slider.focus();
      await page.keyboard.press('ArrowRight');
      await expect(slider).toHaveAttribute(
        'aria-valuenow',
        locale === 'ar' ? '45' : '55',
      );
      await page.keyboard.press('Home');
      await expect(slider).toHaveAttribute('aria-valuenow', '0');
      await page.keyboard.press('End');
      await expect(slider).toHaveAttribute('aria-valuenow', '100');
      const compare = page.locator('before-after');
      await compare.scrollIntoViewIfNeeded();
      const box = (await compare.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2, {
        steps: 8,
      });
      await page.mouse.up();
      expect(Number(await slider.getAttribute('aria-valuenow'))).toBeCloseTo(
        locale === 'ar' ? 25 : 75,
        0,
      );
      const spots = page.locator('.spot');
      await spots.first().focus();
      await page.keyboard.press('Enter');
      await expect(spots.first()).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#spot-0')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(spots.first()).toHaveAttribute('aria-expanded', 'false');
      await spots.nth(1).click();
      await expect(page.locator('#spot-1')).toBeVisible();
      await expect(page.locator('#spot-1 img')).toHaveCount(0);
      await page.locator('#spot-1 .close-detail').click();
      await expect(spots.nth(1)).toBeFocused();
      const thumbnails = page.locator('.thumbnail');
      await thumbnails.first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.counter')).toHaveText('1 / 3');
      await expect(page.locator('.previous')).toBeDisabled();
      await page.keyboard.press(locale === 'ar' ? 'ArrowLeft' : 'ArrowRight');
      await expect(page.locator('.counter')).toHaveText('2 / 3');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(thumbnails.first()).toBeFocused();
      // Swipe through the album; the pointer remains captured beyond its start.
      await thumbnails.first().click();
      const view = (await page.locator('.viewport').boundingBox())!;
      const start = locale === 'ar' ? 0.25 : 0.75,
        end = 1 - start;
      await page.mouse.move(
        view.x + view.width * start,
        view.y + view.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        view.x + view.width * end,
        view.y + view.height / 2,
        { steps: 20 },
      );
      await page.mouse.up();
      await expect(page.locator('.counter')).not.toHaveText('1 / 3');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.keyboard.press(locale === 'ar' ? 'ArrowLeft' : 'ArrowRight');
      await expect(page.locator('.counter')).toHaveText('3 / 3');
      await expect(page.locator('.next')).toBeDisabled();
      await page.keyboard.press('Escape');
    });
  }
  test('story and album links remain usable without JavaScript', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/en/realisations/exemple-villa/');
    await expect(page.locator('[data-chapter]')).toHaveCount(4);
    await expect(page.locator('.thumbnail')).toHaveCount(3);
    await page.locator('.thumbnail').first().click();
    await expect(page).toHaveURL(/\/_astro\/.*\.png$/);
    expect(await page.locator('img').getAttribute('src')).toBeTruthy();
    await context.close();
  });
});
