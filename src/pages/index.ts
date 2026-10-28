import type { APIRoute } from 'astro';

// One on-demand root endpoint enables the adapter's Edge middleware.
// All localized content pages remain prerendered. Middleware negotiates the locale;
// this endpoint retains the French fallback if invoked without that middleware.
export const prerender = false;
export const GET: APIRoute = () =>
  new Response(null, {
    status: 302,
    headers: { Location: '/fr/', 'Cache-Control': 'private, no-store' },
  });
