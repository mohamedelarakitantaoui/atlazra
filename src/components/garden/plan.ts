import { defaultGardenConfig as config } from './config';
import positions from '../../../reference/redesign/assets/plan-rel.json' with { type: 'json' };
import type { Locale } from '../../i18n/routing';

// These coordinates were projected from the approved top-view camera, then
// adjusted in the reference for legibility (terrace: 56%, 41%). The supplied
// plan is a raster render, so projecting the live perspective camera would
// misalign its pins. Update plan-rel.json together with any replacement render.
export const pins = { ...positions, terrace: [56, 41] };
export const callouts = [
  {
    key: 'pergola',
    values: {
      width: config.pergola.width,
      depth: config.pergola.depth,
      slats: config.pergola.slats,
    },
  },
  {
    key: 'terrace',
    values: { width: config.terrace.size[0], depth: config.terrace.size[2] },
  },
  {
    key: 'beds',
    values: { count: config.beds.length, flowers: config.beds[0].flowers },
  },
  {
    key: 'pool',
    values: {
      width: config.pool!.coping.size[0],
      depth: config.pool!.coping.size[2],
    },
  },
  { key: 'path', values: { count: config.path.length } },
  { key: 'hedge', values: { length: config.hedge.size[2] } },
  { key: 'tree', values: { count: config.trees.length } },
] as const;
export function formatCallout(
  template: string,
  values: object,
  locale: Locale,
) {
  const number = new Intl.NumberFormat(locale);
  return Object.entries(values).reduce(
    (text, [key, value]) =>
      text.replaceAll(`{${key}}`, number.format(value as number)),
    template,
  );
}
