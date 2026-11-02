import { getCollection, type CollectionEntry } from 'astro:content';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { chapterKeys, chapterFor, parseStory } from './project-story';
import type { Locale } from '../i18n/routing';

export type Project = CollectionEntry<'projects'>;
export const projectTypes = ['villa', 'riad', 'terrasse', 'pro', '3d'] as const;

export async function publishedProjects() {
  return (
    await getCollection(
      'projects',
      ({ data, id }) =>
        data.status === 'published' &&
        !(
          (import.meta.env.VERCEL || import.meta.env.CI) &&
          id.startsWith('exemple-')
        ),
    )
  ).sort(
    (a, b) =>
      a.data.sort_order - b.data.sort_order ||
      b.data.year - a.data.year ||
      a.id.localeCompare(b.id),
  );
}

export function coverAlt(project: Project, locale: Locale) {
  return project.data.images.find(
    ({ src }) => src.src === project.data.cover.src,
  )!.alt[locale];
}

export async function projectChapters(project: Project, locale: Locale) {
  const chapters = chapterKeys.flatMap((key) => {
    const index = project.data.images.findIndex(
      ({ kind }) => chapterFor(kind) === key,
    );
    return index < 0 ? [] : [{ key, index, image: project.data.images[index] }];
  });
  const story = parseStory(
    project.body ?? '',
    chapters.map(({ key }) => key),
  );
  const markdown = await createMarkdownProcessor();
  return Promise.all(
    chapters.map(async (chapter) => ({
      ...chapter,
      html: (await markdown.render(story[locale][chapter.key]!)).code,
    })),
  );
}
