import { describe, expect, it } from 'vitest';
import { chapterFor, parseStory } from '../../src/lib/project-story';

describe('localized project stories', () => {
  it('keeps locale prose separate and maps design kinds to one chapter', () => {
    const story = parseStory(
      '## fr\n### design\nUn **plan**.\n## ar\n### design\nمخطط.\n## en\n### design\nA plan.',
      ['design'],
    );
    expect(story.fr.design?.trim()).toBe('Un **plan**.');
    expect(story.ar.design?.trim()).toBe('مخطط.');
    expect(chapterFor('render_3d')).toBe('design');
    expect(chapterFor('plan')).toBe('design');
    expect(chapterFor('before')).toBe('before');
  });
  it('fails instead of shipping missing translations or duplicate chapters', () => {
    expect(() => parseStory('## fr\n### before\nTerrain.', ['before'])).toThrow(
      'ar/before',
    );
    expect(() => parseStory('## fr\n### before\nA\n### before\nB', [])).toThrow(
      'Duplicate',
    );
  });
});
