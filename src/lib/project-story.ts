import type { Locale } from '../i18n/routing';

export const chapterKeys = ['before', 'design', 'photo', 'after'] as const;
export type Chapter = (typeof chapterKeys)[number];

/** One index.md: ## fr / ## ar / ## en, then stable ### chapter keys. */
export function parseStory(body: string, required: readonly Chapter[]) {
  const story = { fr: {}, ar: {}, en: {} } as Record<
    Locale,
    Partial<Record<Chapter, string>>
  >;
  let locale: Locale | undefined;
  let chapter: Chapter | undefined;
  for (const line of body.split(/\r?\n/)) {
    const lang = /^## (fr|ar|en)\s*$/.exec(line);
    const heading = /^### (before|design|photo|after)\s*$/.exec(line);
    if (lang) {
      locale = lang[1] as Locale;
      chapter = undefined;
    } else if (heading && locale) {
      chapter = heading[1] as Chapter;
      if (story[locale][chapter] !== undefined)
        throw new Error(`Duplicate chapter ${locale}/${chapter}`);
      story[locale][chapter] = '';
    } else if (locale && chapter) story[locale][chapter] += `${line}\n`;
    else if (line.trim() && !line.startsWith('<!--'))
      throw new Error('Expected ## fr/ar/en and ### before/design/photo/after');
  }
  for (const lang of ['fr', 'ar', 'en'] as const)
    for (const key of required)
      if (!story[lang][key]?.trim())
        throw new Error(`Missing project prose: ${lang}/${key}`);
  return story;
}

export function chapterFor(kind: string): Chapter {
  return kind === 'plan' || kind === 'render_3d' ? 'design' : (kind as Chapter);
}
