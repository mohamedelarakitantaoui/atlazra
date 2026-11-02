import { glob, type Loader } from 'astro/loaders';

/** Filter before store.set registers image imports, not just at route lookup. */
export function projectLoader(hosted: boolean): Loader {
  const files = glob({
    base: './src/content/projects',
    pattern: ['*/index.md', '!_*/**', ...(hosted ? ['!exemple-*/**'] : [])],
    generateId: ({ entry }) => entry.split('/')[0],
  });
  return {
    name: 'published-projects',
    async load(context) {
      context.store.clear();
      await files.load({
        ...context,
        store: {
          ...context.store,
          set(entry) {
            if (entry.data.status !== 'published') {
              context.store.delete(entry.id);
              return false;
            }
            return context.store.set(entry);
          },
        },
      });
    },
  };
}
