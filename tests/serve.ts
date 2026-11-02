import { existsSync } from 'node:fs';
import { serveBuilt } from '../scripts/serve-built.ts';

// Playwright runs against the production build; run `pnpm build` first.
if (!existsSync('.vercel/output/config.json'))
  throw new Error('No production build found. Run `pnpm build` first.');

// The built contact function calls Resend with the global fetch in this
// process. Record those calls instead of sending email.
const emails: { subject: string }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  if (String(input) !== 'https://api.resend.com/emails')
    return realFetch(input, options);
  const payload = JSON.parse(String(options?.body));
  emails.push(payload);
  return payload.subject.includes('RESEND_FAILURE')
    ? Response.json({ message: 'Mock rejection' }, { status: 500 })
    : Response.json({ id: 'mock-email' });
};

const server = await serveBuilt(Number(process.env.PORT ?? 4321), {
  '/__test/emails': (_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(emails));
  },
});
console.log(`Built site for tests: ${server.url}`);
