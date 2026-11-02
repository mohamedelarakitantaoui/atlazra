import fr from './fr.json' with { type: 'json' };
import ar from './ar.json' with { type: 'json' };
import en from './en.json' with { type: 'json' };
import type { Locale } from './routing';

type Schema<T> = {
  [K in keyof T]: T[K] extends string ? string : Schema<T[K]>;
};
// All three schemas participate: a missing key in ANY locale is a type error.
const dictionaries = { fr, ar, en } satisfies Record<
  Locale,
  Schema<typeof fr> & Schema<typeof ar> & Schema<typeof en>
>;
type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];
export type TranslationKey = Paths<typeof fr>;

export function t(lang: Locale, key: TranslationKey): string {
  let value: unknown = dictionaries[lang];
  for (const part of key.split('.')) {
    value = (value as Record<string, unknown>)[part];
  }
  if (typeof value !== 'string')
    throw new Error(`Missing translation: ${lang}.${key}`);
  return value;
}

/** Flat, typed server-rendered copy ported from the approved redesign. */
export const getRedesign = (lang: Locale) => dictionaries[lang].redesign;
