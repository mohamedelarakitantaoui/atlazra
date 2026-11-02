import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ogSize } from './seo';

// Build-time only (prerendered endpoints). Paths are relative to the project
// root, where `astro build` runs. Sharp's text input uses Pango + HarfBuzz,
// so Arabic is shaped and laid out right to left; satori cannot shape it.
const fonts = {
  regular: resolve('src/assets/fonts/og/ibm-plex-sans-arabic-400.ttf'),
  semibold: resolve('src/assets/fonts/og/ibm-plex-sans-arabic-600.ttf'),
};
const families = {
  regular: 'IBM Plex Sans Arabic',
  semibold: 'IBM Plex Sans Arabic SemiBold',
};
const colors = { ink: '#0f2419', ink2: '#465649', forest: '#1b4130' };
const pad = 80;

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function logo(height: number) {
  const svg = (
    await readFile(resolve('public/brand/atlazra-logo.svg'), 'utf8')
  ).replace(/currentColor/g, colors.forest);
  return sharp(Buffer.from(svg), { density: 300 })
    .resize({ height })
    .png()
    .toBuffer();
}

async function text(
  value: string,
  options: {
    size: number;
    weight: 'regular' | 'semibold';
    color: string;
    rtl: boolean;
  },
) {
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${options.color}">${escape(value)}</span>`,
      // Pango reads a trailing "SemiBold" as a weight and then matched the
      // 400 file; the 600 file's family name is "… SemiBold", so name it
      // as the family with a Regular style.
      font: `${families[options.weight]}, Regular ${options.size}`,
      fontfile: fonts[options.weight],
      width: ogSize.width - pad * 2,
      align: options.rtl ? 'right' : 'left',
      dpi: 72,
      rgba: true,
      spacing: Math.round(options.size * 0.25),
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** White 1200×630 card: logo, page heading and one supporting line. */
export async function renderOgImage({
  heading,
  line,
  rtl,
}: {
  heading: string;
  line: string;
  rtl: boolean;
}) {
  const mark = await logo(132);
  const markWidth = (await sharp(mark).metadata()).width ?? 0;
  const title = await text(heading, {
    size: 68,
    weight: 'semibold',
    color: colors.ink,
    rtl,
  });
  const sub = await text(line, {
    size: 30,
    weight: 'regular',
    color: colors.ink2,
    rtl,
  });
  const x = (width: number) => (rtl ? ogSize.width - pad - width : pad);
  const subTop = ogSize.height - pad - sub.height;
  const titleTop = subTop - 24 - title.height;
  return sharp({
    create: { ...ogSize, channels: 4, background: '#ffffff' },
  })
    .composite([
      { input: mark, top: pad - 8, left: x(markWidth) },
      { input: title.data, top: titleTop, left: x(title.width) },
      { input: sub.data, top: subTop, left: x(sub.width) },
    ])
    .png()
    .toBuffer();
}

/** Square raster logo for structured data (search engines prefer PNG). */
export async function renderLogoPng(size = 512) {
  const mark = await logo(Math.round(size * 0.62));
  return sharp({
    create: { width: size, height: size, channels: 4, background: '#ffffff' },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}
