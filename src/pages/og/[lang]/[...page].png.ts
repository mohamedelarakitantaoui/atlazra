import type { APIRoute, GetStaticPaths } from 'astro';
import { locales, type Locale } from '../../../i18n/routing';
import { t } from '../../../i18n/content';
import { ogPages } from '../../../lib/seo';
import { renderOgImage } from '../../../lib/og-image';
import { publishedProjects } from '../../../lib/projects';
import { isPending } from '../../../data/site';

interface Props {
  heading: string;
  line: string;
  locale: Locale;
}

// One image per page and locale, matching ogImagePath() in lib/seo.ts.
export const getStaticPaths = (async () => {
  const projects = await publishedProjects();
  return locales.flatMap((locale) => [
    ...Object.values(ogPages).map(({ file, heading }) => ({
      params: { lang: locale, page: file },
      props: {
        locale,
        heading: t(locale, heading),
        line: t(locale, 'seo.ogTagline'),
      },
    })),
    ...projects.map((project) => ({
      params: { lang: locale, page: `realisations/${project.id}` },
      props: {
        locale,
        heading: project.data.title[locale],
        // Never print a TODO placeholder: the city is left out until known.
        line: [
          t(locale, `projects.types.${project.data.type}`),
          isPending(project.data.city) ? undefined : project.data.city,
        ]
          .filter(Boolean)
          .join(' · '),
      },
    })),
  ]);
}) satisfies GetStaticPaths;

export const GET: APIRoute<Props> = async ({ props }) =>
  new Response(
    new Uint8Array(
      await renderOgImage({
        heading: props.heading,
        line: props.line,
        rtl: props.locale === 'ar',
      }),
    ),
    { headers: { 'Content-Type': 'image/png' } },
  );
