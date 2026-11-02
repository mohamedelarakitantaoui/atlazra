import type { Locale } from '../i18n/routing';
import type { TranslationKey } from '../i18n/content';

export const ogSize = { width: 1200, height: 630 } as const;

/** Pages with their own Open Graph image, by path after the locale. */
export const ogPages = {
  '': { file: 'home', heading: 'home.reference.h1' },
  services: { file: 'services', heading: 'pages.services.title' },
  realisations: { file: 'realisations', heading: 'pages.realisations.title' },
  contact: { file: 'contact', heading: 'contact.title' },
  'mentions-legales': { file: 'legal', heading: 'pages.legal.title' },
  confidentialite: { file: 'privacy', heading: 'pages.privacy.title' },
} as const satisfies Record<string, { file: string; heading: TranslationKey }>;

/**
 * OG image for a localized path: /fr/ → /og/fr/home.png and
 * /fr/realisations/<slug>/ → /og/fr/realisations/<slug>.png. Pages without
 * their own image (thank-you, 404) share the home image.
 */
export function ogImagePath(pathname: string, locale: Locale): string {
  const rest = pathname.split('/').filter(Boolean).slice(1).join('/');
  if (rest.startsWith('realisations/'))
    return `/og/${locale}/${rest.replace(/\/$/, '')}.png`;
  const page = ogPages[rest as keyof typeof ogPages];
  return `/og/${locale}/${page?.file ?? 'home'}.png`;
}
