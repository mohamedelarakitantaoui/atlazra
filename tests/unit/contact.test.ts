import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  contactSchema,
  normalizePhone,
  fieldErrors,
} from '../../src/lib/contact/schema';
import {
  createContactToken,
  validContactToken,
} from '../../src/lib/contact/security';
import { handleContact } from '../../src/lib/contact/server';
import { t } from '../../src/i18n/content';
import { site, whatsappUrl } from '../../src/data/site';

const valid = {
  name: 'Nadia Test',
  phone: '0612345678',
  email: '',
  project_type: 'villa',
  surface_m2: '',
  city: '',
  message: 'Un jardin à Rabat',
  locale: 'fr',
};
const config = {
  secret: 'unit-test-secret',
  apiKey: 'test',
  from: 'sender@example.test',
  to: 'recipient@example.test',
};
afterEach(() => vi.unstubAllGlobals());
describe('Moroccan phone normalization', () => {
  it.each([
    ['0612345678', '+212612345678'],
    ['07 12 34 56 78', '+212712345678'],
    ['+212 612-345-678', '+212612345678'],
    ['00212 (7) 12.34.56.78', '+212712345678'],
    ['0537123456', '+212537123456'],
  ])('%s becomes %s', (input, output) =>
    expect(normalizePhone(input)).toBe(output),
  );
  it.each([
    '123456',
    '+33612345678',
    '002120612345678',
    '+2120612345678',
    '06123456789',
    '06abc345678',
    '++212612345678',
    '',
  ])('rejects %s', (input) => expect(normalizePhone(input)).toBeUndefined());
});
describe('contact schema', () => {
  it('normalizes and omits empty optional fields', () => {
    expect(contactSchema.parse(valid)).toEqual({
      ...valid,
      phone: '+212612345678',
      email: undefined,
      surface_m2: undefined,
      city: undefined,
    });
    expect(
      contactSchema.parse({ ...valid, surface_m2: '12,5' }).surface_m2,
    ).toBe(12.5);
  });
  it.each(['villa', 'riad', 'terrasse', 'pro', '3d'])(
    'accepts %s',
    (project_type) =>
      expect(contactSchema.safeParse({ ...valid, project_type }).success).toBe(
        true,
      ),
  );
  it.each([
    ['name', 'a'],
    ['name', 'x'.repeat(121)],
    ['name', 'name\nBcc: bad'],
    ['phone', '123456'],
    ['email', 'bad@'],
    ['project_type', 'unknown'],
    ['surface_m2', '0'],
    ['surface_m2', '-1'],
    ['surface_m2', 'Infinity'],
    ['surface_m2', '1e9'],
    ['city', 'x'.repeat(121)],
    ['message', 'abc'],
    ['message', 'x'.repeat(4001)],
    ['locale', 'es'],
  ])('rejects invalid %s', (field, value) =>
    expect(contactSchema.safeParse({ ...valid, [field]: value }).success).toBe(
      false,
    ),
  );
  it('accepts exact boundaries and Arabic names', () => {
    expect(
      contactSchema.safeParse({
        ...valid,
        name: 'أحمد',
        message: 'x'.repeat(4000),
        city: 'x'.repeat(120),
      }).success,
    ).toBe(true);
    expect(
      contactSchema.safeParse({
        ...valid,
        name: 'x'.repeat(120),
        message: 'abcd',
      }).success,
    ).toBe(true);
  });
  it.each(['fr', 'ar', 'en'] as const)('localizes errors in %s', (locale) => {
    const parsed = contactSchema.safeParse({ ...valid, name: '' });
    if (parsed.success) throw new Error('Expected invalid name');
    expect(fieldErrors(parsed.error, locale).name).toBe(
      t(locale, 'contact.form.errors.name'),
    );
  });
});
describe('signed minimum fill time', () => {
  const now = 1800000000000;
  it('checks the exact three-second boundary and expires after two hours', () => {
    const token = createContactToken(config.secret, now);
    expect(validContactToken(token, config.secret, now + 2999)).toBe(false);
    expect(validContactToken(token, config.secret, now + 3000)).toBe(true);
    expect(validContactToken(token, config.secret, now + 7200001)).toBe(false);
    expect(validContactToken(token, config.secret, now - 1)).toBe(false);
    expect(validContactToken(token, 'other-secret', now + 3000)).toBe(false);
    expect(
      validContactToken(
        token.replace(String(now), String(now - 5000)),
        config.secret,
        now + 3000,
      ),
    ).toBe(false);
    expect(validContactToken(token, '', now + 3000)).toBe(false);
    expect(validContactToken('malformed', config.secret, now)).toBe(false);
  });
});
describe('server delivery', () => {
  const request = (extra = {}, accept = 'application/json') =>
    new Request('https://site.test/api/contact/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: accept },
      body: JSON.stringify({
        ...valid,
        website: '',
        token: createContactToken(config.secret, Date.now() - 4000),
        ...extra,
      }),
    });
  it('sends every field, reply-to, normalized WhatsApp link and idempotency key', async () => {
    const send = vi.fn().mockResolvedValue(Response.json({ id: 'ok' }));
    vi.stubGlobal('fetch', send);
    const response = await handleContact(
      request({
        email: 'visitor@example.test',
        surface_m2: '90',
        city: 'Rabat',
      }),
      config,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const options = send.mock.calls[0][1];
    const body = JSON.parse(options.body);
    expect(body.reply_to).toBe('visitor@example.test');
    expect(body.to).toEqual([config.to]);
    expect(body.subject).toBe('Nouvelle demande — villa — Nadia Test');
    for (const value of [
      'Nadia Test',
      '+212612345678',
      'visitor@example.test',
      'villa',
      '90',
      'Rabat',
      'fr',
      valid.message,
      'https://wa.me/212612345678',
    ])
      expect(body.text).toContain(value);
    expect(options.headers['Idempotency-Key']).toMatch(/^[a-f0-9]{64}$/);
  });
  it.each([
    { website: 'bot' },
    { token: 'bad' },
    { token: createContactToken(config.secret) },
    { name: '' },
  ])('rejects invalid submissions without sending', async (extra) => {
    const send = vi.fn();
    vi.stubGlobal('fetch', send);
    expect((await handleContact(request(extra), config)).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
  it('returns 502 on provider failure and transport error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({}, { status: 429 })),
    );
    expect((await handleContact(request(), config)).status).toBe(502);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect((await handleContact(request(), config)).status).toBe(502);
  });
  it('rejects malformed and oversized bodies', async () => {
    for (const body of ['{bad', 'x'.repeat(65537)]) {
      const result = await handleContact(
        new Request('https://site.test/api/contact/', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body,
        }),
        config,
      );
      expect(result.status).toBe(400);
    }
  });
  it('accepts a maximum-length Unicode message in a native form body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ id: 'ok' })),
    );
    const body = new URLSearchParams({
      ...valid,
      website: '',
      token: createContactToken(config.secret, Date.now() - 4000),
      message: '庭'.repeat(4000),
    });
    const response = await handleContact(
      new Request('https://site.test/api/contact/', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      }),
      config,
    );
    expect(response.status).toBe(200);
  });
});

describe('whatsappUrl', () => {
  const pending = site.whatsapp;
  afterEach(() => {
    site.whatsapp = pending;
  });
  it('stays hidden while the number is a client TODO', () => {
    expect(whatsappUrl('fr')).toBeUndefined();
  });
  it('builds a localized wa.me link once a number is supplied', () => {
    site.whatsapp = '+212 6 00 00 00 00';
    expect(whatsappUrl('fr')).toBe(
      `https://wa.me/212600000000?text=${encodeURIComponent(site.whatsappMessage.fr)}`,
    );
    expect(whatsappUrl('en')).toMatch(
      /^https:\/\/wa\.me\/212600000000\?text=Hello/,
    );
  });
});
