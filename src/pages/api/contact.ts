import type { APIRoute } from 'astro';
import { handleContact } from '../../lib/contact/server';
export const prerender = false;
export const POST: APIRoute = ({ request }) =>
  handleContact(request, {
    apiKey: process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY ?? '',
    to: process.env.CONTACT_TO_EMAIL ?? import.meta.env.CONTACT_TO_EMAIL ?? '',
    from:
      process.env.CONTACT_FROM_EMAIL ??
      import.meta.env.CONTACT_FROM_EMAIL ??
      '',
    secret:
      process.env.CONTACT_SIGNING_SECRET ??
      import.meta.env.CONTACT_SIGNING_SECRET ??
      '',
  });
