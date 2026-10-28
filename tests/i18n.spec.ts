import { expect, test } from '@playwright/test';
import fr from '../src/i18n/fr.json';
import ar from '../src/i18n/ar.json';
import en from '../src/i18n/en.json';

function keys(value: object, prefix = ''): string[] {
  return Object.entries(value)
    .flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof child === 'string' ? [path] : keys(child, path);
    })
    .sort();
}

test('all locales have identical translation key sets', () => {
  expect(keys(ar)).toEqual(keys(fr));
  expect(keys(en)).toEqual(keys(fr));
});
