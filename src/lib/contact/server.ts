import { createHash } from 'node:crypto';
import { contactSchema, fieldErrors, type ContactErrors } from './schema';
import { validContactToken } from './security';
import { locales, type Locale } from '../../i18n/routing';
import { t } from '../../i18n/content';
export interface ContactConfig {
  apiKey: string;
  to: string;
  from: string;
  secret: string;
}
export async function handleContact(
  request: Request,
  config: ContactConfig,
): Promise<Response> {
  const json =
    request.headers.get('accept')?.includes('application/json') ||
    request.headers.get('content-type')?.includes('application/json');
  let locale: Locale = 'fr';
  const respond = (status: number, errors: ContactErrors = {}) => {
    const headers = { 'Cache-Control': 'private, no-store' };
    if (json)
      return Response.json(status === 200 ? { ok: true } : { errors }, {
        status,
        headers,
      });
    // Only field identifiers travel in redirects, never names, phones or messages.
    const destination =
      status === 200
        ? `/${locale}/contact/merci/`
        : `/${locale}/contact/?${new URLSearchParams({ errors: Object.keys(errors).join(','), ...(status === 502 ? { failed: '1' } : {}) })}#contact-form`;
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: destination },
    });
  };
  let raw: Record<string, unknown>;
  try {
    // Bound the body even without Content-Length; uploads are not supported.
    const reader = request.body?.getReader();
    if (!reader)
      return respond(400, { form: t(locale, 'contact.form.errors.form') });
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      // Leave room for percent-encoded Unicode in a native form POST.
      if (size > 65536) {
        await reader.cancel();
        return respond(400, { form: t(locale, 'contact.form.errors.form') });
      }
      chunks.push(value);
    }
    const body = new TextDecoder().decode(Buffer.concat(chunks));
    raw = request.headers.get('content-type')?.includes('application/json')
      ? JSON.parse(body)
      : Object.fromEntries(new URLSearchParams(body));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new Error('Invalid body');
    locale = locales.find((lang) => lang === raw.locale) ?? 'fr';
  } catch {
    return respond(400, { form: t(locale, 'contact.form.errors.form') });
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return respond(400, { form: t(locale, 'contact.form.errors.spam') });
  // No rate-limit store: the showcase has no database. These checks deter simple
  // bots; they do not enforce a request quota or prevent deliberate token replay.
  if (typeof raw.website !== 'string' || raw.website !== '')
    return respond(400, { spam: t(locale, 'contact.form.errors.spam') });
  if (!validContactToken(raw.token, config.secret))
    return respond(400, { time: t(locale, 'contact.form.errors.time') });
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return respond(400, fieldErrors(parsed.error, locale));
  const data = parsed.data;
  if (!config.apiKey || !config.to || !config.from)
    return respond(502, { form: t(locale, 'contact.form.failure') });
  const text = [
    `Nom: ${data.name}`,
    `Téléphone: ${data.phone}`,
    `Email: ${data.email ?? '—'}`,
    `Type: ${data.project_type}`,
    `Surface (m²): ${data.surface_m2 ?? '—'}`,
    `Ville: ${data.city ?? '—'}`,
    `Langue: ${data.locale}`,
    `Message:\n${data.message}`,
    `WhatsApp: https://wa.me/${data.phone.slice(1)}`,
  ].join('\n');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        // Retrying an unchanged request cannot send twice, including after a timeout.
        'Idempotency-Key': createHash('sha256')
          .update(String(raw.token) + JSON.stringify(data))
          .digest('hex'),
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        subject: `Nouvelle demande — ${data.project_type} — ${data.name}`,
        text,
        ...(data.email ? { reply_to: data.email } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Email rejected');
    const result = (await response.json()) as { id?: string };
    if (!result.id) throw new Error('Missing receipt');
    return respond(200);
  } catch {
    return respond(502, { form: t(locale, 'contact.form.failure') });
  }
}
