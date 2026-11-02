import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { locales } from '../src/i18n/routing';

// Fails on serious or critical issues. With AXE_REPORT=<dir> it also writes
// every result (all impacts) for docs/qa.md.
const examples = process.env.PROJECT_EXAMPLES === '1';
const report = process.env.AXE_REPORT;
const pages = [
  '',
  'services/',
  'realisations/',
  'contact/',
  'contact/merci/',
  'mentions-legales/',
  'confidentialite/',
  ...(examples ? ['realisations/exemple-villa/'] : []),
];

async function audit(page: Page, name: string) {
  const results = await new AxeBuilder({ page })
    .withTags([
      'wcag2a',
      'wcag2aa',
      'wcag21a',
      'wcag21aa',
      'wcag22aa',
      'best-practice',
    ])
    .analyze();
  if (report) {
    await mkdir(report, { recursive: true });
    await writeFile(
      `${report}/${name.replace(/[^a-z0-9-]+/gi, '_')}.json`,
      JSON.stringify({
        name,
        passes: results.passes.length,
        incomplete: results.incomplete.map((r) => ({
          id: r.id,
          nodes: r.nodes.map((n) => n.target.join(' ')),
        })),
        violations: results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target.join(' ')),
        })),
      }),
    );
  }
  const blocking = results.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  );
  expect(
    blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
  ).toEqual([]);
}

for (const locale of locales)
  for (const path of pages)
    test(`axe /${locale}/${path}`, async ({ page }) => {
      await page.goto(`/${locale}/${path}`);
      await page.evaluate(() => document.fonts.ready);
      await audit(page, `${locale}-${path || 'home'}`);
    });

test('axe 404', async ({ page }) => {
  expect((await page.goto('/fr/page-introuvable/'))?.status()).toBe(404);
  await audit(page, 'fr-404');
});

for (const locale of ['fr', 'ar'] as const)
  test(`axe open mobile menu ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${locale}/services/`);
    await page.locator('.menu-btn').click();
    await expect(page.locator('.main-nav')).toHaveAttribute(
      'data-open',
      'true',
    );
    await audit(page, `${locale}-menu-open`);
  });

test.describe('with published examples', () => {
  test.skip(!examples, 'Needs the local examples build.');
  for (const locale of ['fr', 'ar'] as const)
    test(`axe open lightbox ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/realisations/exemple-villa/`);
      await page.locator('project-album a').first().click();
      await expect(page.locator('dialog[open]')).toBeVisible();
      await audit(page, `${locale}-lightbox-open`);
    });
});
