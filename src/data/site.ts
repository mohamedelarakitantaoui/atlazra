import type { Locale } from '../i18n/routing';
type Localized = Record<Locale, string>;
interface SiteDetails {
  phone: string;
  whatsapp: string;
  email: string;
  hours: Localized;
  instagram: string;
  address: Localized;
  mapUrl: string;
  geo: { latitude: number; longitude: number };
  areaServed: string[];
  whatsappMessage: Localized;
}
export const site: SiteDetails = {
  phone: 'TODO(client): phone',
  whatsapp: 'TODO(client): whatsapp',
  email: 'TODO(client): email',
  hours: {
    fr: 'TODO(client): horaires',
    ar: 'TODO(client): ساعات العمل',
    en: 'TODO(client): opening hours',
  },
  instagram: 'TODO(client): Instagram URL',
  // TODO(client): confirm Dar Nizar label; the supplied map pin says Top Dar Fleur.
  address: {
    fr: 'Dar Nizar, Rabat – Salé',
    ar: 'دار نزار، الرباط – سلا',
    en: 'Dar Nizar, Rabat – Salé',
  },
  mapUrl: 'https://maps.app.goo.gl/6f43CHxzyrMHoT4f9',
  // The supplied Google Maps pin.
  geo: { latitude: 34.1051351, longitude: -6.7560591 },
  areaServed: ['Rabat', 'Salé', 'Kénitra', 'Témara'],
  whatsappMessage: {
    fr: 'Bonjour Atlazra Design, je souhaite parler de mon projet de jardin.',
    ar: 'مرحباً أطلازرا ديزاين، أود التحدث عن مشروع حديقتي.',
    en: 'Hello Atlazra Design, I would like to discuss my garden project.',
  },
};
// Any client placeholder, with or without a note after the colon.
export const isPending = (value: string) => value.startsWith('TODO(client)');
export function whatsappUrl(locale: Locale): string | undefined {
  if (isPending(site.whatsapp)) return undefined;
  const phone = site.whatsapp.replace(/[^0-9]/g, '');
  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(site.whatsappMessage[locale])}`
    : undefined;
}
