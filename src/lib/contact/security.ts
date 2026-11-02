import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
const signature = (payload: string, secret: string) =>
  createHmac('sha256', secret).update(payload).digest('hex');
export function createContactToken(secret: string, now = Date.now()): string {
  if (!secret) return ''; // No configured secret: fail closed on submission.
  const payload = `${now}.${randomBytes(16).toString('hex')}`;
  return `${payload}.${signature(payload, secret)}`;
}
export function validContactToken(
  token: unknown,
  secret: string,
  now = Date.now(),
): boolean {
  if (
    !secret ||
    typeof token !== 'string' ||
    !/^\d{13}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)
  )
    return false;
  const [timestamp, nonce, digest] = token.split('.');
  const age = now - Number(timestamp);
  return (
    age >= 3000 &&
    age <= 2 * 60 * 60 * 1000 &&
    timingSafeEqual(
      Buffer.from(digest, 'hex'),
      Buffer.from(signature(timestamp + '.' + nonce, secret), 'hex'),
    )
  );
}
