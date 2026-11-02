import { defineCollection, z } from 'astro:content';
import { projectLoader } from './lib/project-loader';

const localizedText = (max = Infinity) =>
  z.object({
    fr: z.string().trim().min(1).max(max),
    ar: z.string().trim().min(1).max(max),
    en: z.string().trim().min(1).max(max),
  });
const localized = localizedText();
const projects = defineCollection({
  loader: projectLoader(Boolean(import.meta.env.VERCEL || import.meta.env.CI)),
  schema: ({ image }) =>
    z
      .object({
        status: z.enum(['draft', 'published']),
        type: z.enum(['villa', 'riad', 'terrasse', 'pro', '3d']),
        city: z.string().trim().min(1),
        surface_m2: z.number().positive().optional(),
        year: z.number().int().min(1900).max(2100),
        sort_order: z.number().int(),
        // The page title adds " — Atlazra Design" (60 chars in all); the
        // summary is the meta description.
        title: localizedText(43),
        summary: localizedText(155),
        cover: image(),
        images: z
          .array(
            z.object({
              src: image(),
              kind: z.enum(['photo', 'render_3d', 'before', 'after', 'plan']),
              alt: localized,
            }),
          )
          .min(1),
        hotspots: z
          .array(
            z.object({
              x: z.number().min(0).max(100),
              y: z.number().min(0).max(100),
              label: localized,
              image: image().optional(),
              text: localized,
            }),
          )
          .optional(),
      })
      .superRefine((data, ctx) => {
        if (!data.images.some(({ src }) => src.src === data.cover.src))
          ctx.addIssue({
            code: 'custom',
            path: ['cover'],
            message: 'Include the cover in images with localized alt text.',
          });
        if (
          data.hotspots?.length &&
          !data.images.some(({ kind }) => kind === 'plan')
        )
          ctx.addIssue({
            code: 'custom',
            path: ['hotspots'],
            message: 'Hotspots require a plan image.',
          });
      }),
});

export const collections = { projects };
