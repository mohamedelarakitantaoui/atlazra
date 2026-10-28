import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import { env } from 'node:process';
import { URL } from 'node:url';

// TODO(client): set SITE_URL to the confirmed canonical domain before launch.
const site = env.SITE_URL || 'https://atlazra.ma';

export default defineConfig({
  site,
  i18n: {
    locales: ['fr', 'ar', 'en'],
    defaultLocale: 'fr',
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'fr', locales: { fr: 'fr', ar: 'ar', en: 'en' } },
      filter: (page) =>
        !/^\/(?:fr|ar|en)\/dev(?:\/|$)/.test(new URL(page).pathname),
    }),
  ],
  output: 'static',
  adapter: vercel({ edgeMiddleware: true }),
  trailingSlash: 'always',
});
