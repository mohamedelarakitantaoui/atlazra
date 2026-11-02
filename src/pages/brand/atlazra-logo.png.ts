import type { APIRoute } from 'astro';
import { renderLogoPng } from '../../lib/og-image';

// 512 × 512 PNG of the logo on white, used as the structured-data logo.
export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await renderLogoPng()), {
    headers: { 'Content-Type': 'image/png' },
  });
