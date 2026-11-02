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
    {
      name: 'bundle-contact-validation',
      hooks: {
        'astro:config:setup': ({ command, updateConfig }) => {
          // Vercel's function packager otherwise copies pnpm symlinks, which
          // Windows cannot create without Developer Mode. Dev needs no change.
          if (command === 'build')
            updateConfig({
              vite: { ssr: { noExternal: ['zod'] } },
              // All project images are prerendered by Sharp. No request-time
              // image transforms are needed in the contact-only Node function.
              image: {
                endpoint: { entrypoint: 'src/lib/static-image-endpoint.ts' },
              },
            });
        },
      },
    },
    sitemap({
      customPages: ['fr', 'ar', 'en'].map((lang) => `${site}/${lang}/contact/`),
      i18n: { defaultLocale: 'fr', locales: { fr: 'fr', ar: 'ar', en: 'en' } },
      filter: (page) =>
        !/^\/(?:fr|ar|en)\/(?:dev(?:\/|$)|contact\/merci\/)/.test(
          new URL(page).pathname,
        ),
    }),
  ],
  // The Node function rebuilds request URLs from Host / X-Forwarded-Host only
  // for these hosts, else as localhost, and Astro's checkOrigin then rejects
  // every form POST. Loopback serves the local production build in tests.
  security: {
    allowedDomains: [
      { hostname: new URL(site).hostname, protocol: 'https' },
      { hostname: `www.${new URL(site).hostname}`, protocol: 'https' },
      { hostname: '**.vercel.app', protocol: 'https' },
      { hostname: '127.0.0.1', protocol: 'http' },
      { hostname: 'localhost', protocol: 'http' },
    ],
  },
  output: 'static',
  adapter: vercel(),
  trailingSlash: 'always',
});
