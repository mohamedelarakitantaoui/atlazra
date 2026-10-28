export const locales = ['fr', 'ar', 'en'] as const;
export type Locale = (typeof locales)[number];

export function localizedPath(path: string, locale: Locale): string {
  const url = new URL(path, 'https://atlazra.invalid');
  const segments = url.pathname.split('/').filter(Boolean);
  if (locales.includes(segments[0] as Locale)) segments.shift();
  const suffix = segments.length ? `${segments.join('/')}/` : '';
  return `/${locale}/${suffix}${url.search}${url.hash}`;
}

// Match region tags to the supported base language, respecting q values and exclusions.
export function preferredLocale(header: string | null): Locale {
  const preferences = (header ?? '').split(',').map((entry, index) => {
    const [tag, ...parameters] = entry.trim().toLowerCase().split(';');
    const quality = parameters.find((parameter) =>
      parameter.trim().startsWith('q='),
    );
    const q = quality ? Number(quality.trim().slice(2)) : 1;
    return { tag, q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0, index };
  });
  const candidates = locales.map((locale) => {
    const matches = preferences.filter(
      ({ tag }) => tag.split('-')[0] === locale,
    );
    const best = matches.sort((a, b) => b.q - a.q || a.index - b.index)[0];
    const wildcard = preferences.find(({ tag }) => tag === '*');
    return {
      locale,
      q: best?.q ?? wildcard?.q ?? 0,
      index: best?.index ?? wildcard?.index ?? Infinity,
    };
  });
  return (
    candidates
      .filter(({ q }) => q > 0)
      .sort((a, b) => b.q - a.q || a.index - b.index)[0]?.locale ?? 'fr'
  );
}
