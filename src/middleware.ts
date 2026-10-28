import { defineMiddleware } from 'astro:middleware';
import { preferredLocale } from './i18n/routing';

export const onRequest = defineMiddleware(({ url, request }, next) => {
  if (url.pathname !== '/') return next();
  const locale = preferredLocale(request.headers.get('accept-language'));
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/${locale}/${url.search}`,
      Vary: 'Accept-Language',
      'Cache-Control': 'private, no-store',
    },
  });
});
