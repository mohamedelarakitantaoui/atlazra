import { expect, test, type APIRequestContext } from '@playwright/test';
import { locales } from '../src/i18n/routing';
import { t } from '../src/i18n/content';

const examples = process.env.PROJECT_EXAMPLES === '1';
const pages = [
  '',
  'services/',
  'realisations/',
  'contact/',
  'mentions-legales/',
  'confidentialite/',
  ...(examples ? ['realisations/exemple-villa/'] : []),
];
const origin = 'https://atlazra.ma';

async function pngSize(request: APIRequestContext, url: string) {
  const response = await request.get(new URL(url).pathname);
  expect(response.status(), url).toBe(200);
  expect(response.headers()['content-type']).toBe('image/png');
  const body = await response.body();
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
}

for (const locale of locales)
  for (const path of pages)
    test(`head metadata /${locale}/${path}`, async ({ page, request }) => {
      await page.goto(`/${locale}/${path}`);
      const head = page.locator('head');
      const title = await page.title();
      const description = await head
        .locator('meta[name="description"]')
        .getAttribute('content');
      expect(title.length, title).toBeLessThanOrEqual(60);
      expect(description!.length, description!).toBeLessThanOrEqual(155);
      expect(title + description).not.toContain('TODO');
      await expect(head.locator('meta[name="robots"]')).toHaveCount(0);
      await expect(head.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${origin}/${locale}/${path}`,
      );
      for (const lang of locales)
        await expect(
          head.locator(`link[rel="alternate"][hreflang="${lang}"]`),
        ).toHaveAttribute('href', `${origin}/${lang}/${path}`);
      await expect(
        head.locator('link[rel="alternate"][hreflang="x-default"]'),
      ).toHaveAttribute('href', `${origin}/fr/${path}`);
      await expect(head.locator('meta[property="og:title"]')).toHaveAttribute(
        'content',
        title,
      );
      await expect(head.locator('meta[property="og:locale"]')).toHaveAttribute(
        'content',
        t(locale, 'seo.ogLocale'),
      );
      const image = await head
        .locator('meta[property="og:image"]')
        .getAttribute('content');
      expect(image).toMatch(new RegExp(`^${origin}/og/${locale}/.+\\.png$`));
      expect(await pngSize(request, image!)).toEqual({
        width: 1200,
        height: 630,
      });
    });

test('titles are unique per locale and French copy uses the target phrases', async ({
  page,
}) => {
  const copy: Record<string, string[]> = {};
  for (const locale of locales) {
    copy[locale] = [];
    for (const path of pages) {
      await page.goto(`/${locale}/${path}`);
      copy[locale].push(
        `${await page.title()} | ${await page
          .locator('meta[name="description"]')
          .getAttribute('content')}`,
      );
    }
    const titles = copy[locale].map((entry) => entry.split(' | ')[0]);
    expect(new Set(titles).size).toBe(titles.length);
  }
  const french = copy.fr.join('\n');
  for (const phrase of [
    /paysagiste à Rabat/i,
    /paysagiste à Rabat et Salé/i,
    /aménagement de jardin de villa/i,
    /conception de jardin 3D au Maroc/i,
  ])
    expect(french).toMatch(phrase);
});

test('thank-you page is noindex; 404 relies on its status', async ({
  page,
}) => {
  expect((await page.goto('/fr/contact/merci/'))?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex',
  );
  for (const response of [
    await page.goto('/fr/contact/merci/'),
    await page.goto('/ar/page-introuvable/'),
  ]) {
    expect(response).toBeTruthy();
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('link[hreflang]')).toHaveCount(0);
  }
  expect((await page.goto('/ar/page-introuvable/'))?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

for (const locale of locales)
  test(`home structured data ${locale}`, async ({ page, request }) => {
    await page.goto(`/${locale}/`);
    const raw = await page
      .locator('script[type="application/ld+json"]')
      .textContent();
    expect(raw).not.toContain('TODO');
    const data = JSON.parse(raw!);
    expect(data['@type']).toBe('HomeAndConstructionBusiness');
    expect(data.name).toBe('Atlazra Design');
    expect(data.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 34.1051351,
      longitude: -6.7560591,
    });
    expect(data.areaServed.map((city: { name: string }) => city.name)).toEqual([
      'Rabat',
      'Salé',
      'Kénitra',
      'Témara',
    ]);
    expect(data.address.addressCountry).toBe('MA');
    // Phone, email and Instagram are still TODO(client) in src/data/site.ts.
    for (const key of ['telephone', 'email', 'sameAs', 'openingHours'])
      expect(data).not.toHaveProperty(key);
    expect(await pngSize(request, data.logo)).toEqual({
      width: 512,
      height: 512,
    });
  });

test('robots.txt points to the sitemap and keeps the API out', async ({
  request,
}) => {
  const body = await (await request.get('/robots.txt')).text();
  expect(body).toContain('User-agent: *');
  expect(body).toContain('Disallow: /api/');
  expect(body).toContain(`Sitemap: ${origin}/sitemap-index.xml`);
});

test('sitemap lists every public page once, and nothing else', async ({
  request,
}) => {
  const index = await (await request.get('/sitemap-index.xml')).text();
  expect(index).toContain(`${origin}/sitemap-0.xml`);
  const xml = await (await request.get('/sitemap-0.xml')).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const expected = locales.flatMap((locale) =>
    [
      '',
      'services/',
      'realisations/',
      'contact/',
      'mentions-legales/',
      'confidentialite/',
      ...(examples
        ? ['realisations/exemple-villa/', 'realisations/exemple-terrasse/']
        : []),
    ].map((path) => `${origin}/${locale}/${path}`),
  );
  expect(urls.sort()).toEqual(expected.sort());
  expect(xml).toContain('hreflang="ar"');
});
