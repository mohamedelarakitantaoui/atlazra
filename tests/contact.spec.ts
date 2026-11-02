import { expect, test, type Page } from '@playwright/test';
import { t } from '../src/i18n/content';
import { locales } from '../src/i18n/routing';

async function fill(page: Page, name: string) {
  await page.locator('#name').fill(name);
  await page.locator('#phone').fill('06 12 34 56 78');
  await page.locator('#email').fill('visitor@example.test');
  await page.locator('#surface_m2').fill('120');
  await page.locator('#city').fill('Rabat');
  await page.locator('#message').fill('Un jardin avec une terrasse.');
}
async function mature(page: Page) {
  const token = await page.locator('[name="token"]').inputValue();
  await page.waitForTimeout(
    Math.max(0, 3100 - (Date.now() - Number(token.split('.')[0]))),
  );
}
const submit = (page: Page) =>
  page.locator('contact-form button[type="submit"]');

for (const locale of locales) {
  test(`contact success ${locale}`, async ({ page, request }) => {
    const name = `Success ${locale}`;
    await page.goto(`/${locale}/contact/`);
    await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
    await fill(page, name);
    await mature(page);
    // Hold the request so the short-lived loading label can be observed.
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/api/contact/', async (route) => {
      await held;
      await route.continue();
    });
    const result = page.waitForResponse((response) =>
      response.url().endsWith('/api/contact/'),
    );
    await submit(page).click();
    await expect(submit(page)).toHaveText(t(locale, 'contact.form.loading'));
    release();
    expect((await result).status()).toBe(200);
    await expect(page.locator('.success')).toBeVisible();
    await expect(page.locator('contact-form form')).toBeHidden();
    await expect(page.locator('.success')).toBeFocused();
    const emails = await (await request.get('/__test/emails')).json();
    const email = emails.find((item: { subject: string }) =>
      item.subject.endsWith(name),
    );
    expect(email.subject).toBe(`Nouvelle demande — villa — ${name}`);
    expect(email.reply_to).toBe('visitor@example.test');
    for (const value of [
      '+212612345678',
      '120',
      'Rabat',
      locale,
      'https://wa.me/212612345678',
    ])
      expect(email.text).toContain(value);
  });
  test(`field errors on blur and server ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}/contact/`);
    await page.locator('#name').fill('X');
    await page.locator('#phone').focus();
    await expect(page.locator('#name-error')).toHaveText(
      t(locale, 'contact.form.errors.name'),
    );
    await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
    await mature(page);
    const result = await page.evaluate(async () => {
      const data = Object.fromEntries(
        new FormData(
          document.querySelector('contact-form form') as HTMLFormElement,
        ),
      );
      const response = await fetch('/api/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return { status: response.status, body: await response.json() };
    });
    expect(result.status).toBe(400);
    expect(result.body.errors.name).toBe(t(locale, 'contact.form.errors.name'));
    expect(result.body.errors.phone).toBe(
      t(locale, 'contact.form.errors.phone'),
    );
    expect(result.body.errors.message).toBe(
      t(locale, 'contact.form.errors.message'),
    );
  });
}

test('honeypot returns 400 and never attempts email', async ({
  page,
  request,
}) => {
  await page.goto('/fr/contact/');
  await fill(page, 'Honeypot Test');
  await mature(page);
  await page.locator('[name="website"]').evaluate((input: HTMLInputElement) => {
    input.value = 'https://spam.test';
  });
  const result = page.waitForResponse((response) =>
    response.url().endsWith('/api/contact/'),
  );
  await submit(page).click();
  expect((await result).status()).toBe(400);
  await expect(page.locator('.summary')).toHaveText(
    t('fr', 'contact.form.errors.spam'),
  );
  const emails = await (await request.get('/__test/emails')).json();
  expect(
    emails.some((item: { subject: string }) =>
      item.subject.includes('Honeypot Test'),
    ),
  ).toBe(false);
});

// Production keeps WhatsApp hidden until the client supplies a real number;
// the link format with a number is covered in tests/unit/contact.test.ts.
test('Resend failure returns 502, hides pending WhatsApp and retries', async ({
  page,
}) => {
  await page.goto('/fr/contact/');
  await fill(page, 'RESEND_FAILURE');
  await mature(page);
  const result = page.waitForResponse((response) =>
    response.url().endsWith('/api/contact/'),
  );
  await submit(page).click();
  expect((await result).status()).toBe(502);
  await expect(page.locator('.failure')).toBeVisible();
  await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
  await expect(submit(page)).toHaveText(t('fr', 'contact.form.retry'));
  await page.locator('#name').fill('Retry Success');
  await submit(page).click();
  await expect(page.locator('.success')).toBeVisible();
});

test('normal POST works without JavaScript, including localized errors and success', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('/ar/contact/');
    await mature(page);
    await submit(page).click();
    await expect(page).toHaveURL(/\/ar\/contact\/\?errors=/);
    await expect(page.locator('#name-error')).toHaveText(
      t('ar', 'contact.form.errors.name'),
    );
    await fill(page, 'No JS Arabic');
    await mature(page);
    await submit(page).click();
    await expect(page).toHaveURL(/\/ar\/contact\/merci\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      t('ar', 'contact.form.success'),
    );
  } finally {
    await context.close();
  }
});

test('normal POST provider failure redirects to retry', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('/en/contact/');
    await fill(page, 'RESEND_FAILURE nojs');
    await mature(page);
    await submit(page).click();
    await expect(page).toHaveURL(/\/en\/contact\/\?.*failed=1/);
    await expect(page.locator('.failure')).toBeVisible();
    await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
    await expect(submit(page)).toHaveText(t('en', 'contact.form.retry'));
  } finally {
    await context.close();
  }
});

for (const locale of locales)
  for (const width of [390, 1440]) {
    test(`capture contact ${locale} ${width}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/${locale}/contact/`);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.locator('[data-language-switch] a[lang="ar"]'),
      ).toBeVisible();
      const path = info.outputPath(`contact-${locale}-${width}.png`);
      await page.screenshot({
        path,
        fullPage: true,
        animations: 'disabled',
      });
      await info.attach('contact', { path, contentType: 'image/png' });
    });
  }
