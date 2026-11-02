import { site, isPending } from '../data/site';
import { t } from '../i18n/content';
import type { Locale } from '../i18n/routing';

/**
 * HomeAndConstructionBusiness for the home page. Fields still marked
 * TODO(client) in src/data/site.ts are left out, never printed.
 */
export function businessJsonLd(locale: Locale, origin: URL) {
  const known = (value: string) => (isPending(value) ? undefined : value);
  const telephone = known(site.phone);
  const email = known(site.email);
  const instagram = known(site.instagram);
  return {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': new URL('/#business', origin).href,
    name: t(locale, 'footer.brand'),
    slogan: t(locale, 'home.title'),
    description: t(locale, 'seo.home.description'),
    url: new URL(`/${locale}/`, origin).href,
    logo: new URL('/brand/atlazra-logo.png', origin).href,
    image: new URL(`/og/${locale}/home.png`, origin).href,
    address: {
      '@type': 'PostalAddress',
      // TODO(client): confirm the "Dar Nizar" label (the map pin says Top Dar Fleur).
      streetAddress: 'Dar Nizar',
      addressRegion: 'Rabat-Salé-Kénitra',
      addressCountry: 'MA',
    },
    geo: { '@type': 'GeoCoordinates', ...site.geo },
    hasMap: site.mapUrl,
    areaServed: site.areaServed.map((name) => ({ '@type': 'City', name })),
    ...(telephone && { telephone }),
    ...(email && { email }),
    ...(instagram && { sameAs: [instagram] }),
  };
}

/** Serialise for an inline script without letting "</script>" break out. */
export const jsonLdScript = (data: unknown) =>
  JSON.stringify(data).replace(/</g, '\u003c');
