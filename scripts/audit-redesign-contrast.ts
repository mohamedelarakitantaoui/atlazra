// Contrast of every visible text colour on its real background.
// Usage: node scripts/audit-contrast.ts   (after `pnpm build`; needs the
// examples published locally for the project story, lightbox and slider).
// Writes artifacts/phase-6c/contrast/contrast.{json,md}.
//
// 1. Solid backgrounds: the background colours under the text's centre are
//    composited (elementsFromPoint) until opaque.
// 2. Anything else (image, canvas, translucent layer, opacity, disabled):
//    the text is hidden, the element is screenshotted and every pixel is a
//    candidate background within the content box (excluding padding/corners);
//    the 5th-percentile worst ratio is reported.
// 3. The sticky translucent header is sampled at five scroll positions.
// 4. Placeholders use ::placeholder on the field's own background.
import { chromium, type Page } from '@playwright/test';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { serveBuilt } from './serve-built.ts';

type RGBA = [number, number, number, number];
interface Item {
  id: number;
  label: string;
  fg: RGBA;
  opacity: number;
  bg: RGBA | null;
  size: number;
  weight: number;
  disabled: boolean;
  placeholder: boolean;
  header: boolean;
}
interface Row {
  page: string;
  label: string;
  fg: string;
  bg: string;
  ratio: number;
  large: boolean;
  method: 'solid' | 'pixels' | 'header-scroll';
  disabled: boolean;
  placeholder: boolean;
}

const lum = ([r, g, b]: number[]) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const blend = (fg: RGBA, bg: number[], alpha = fg[3]) =>
  [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha));
const hex = (c: number[]) =>
  '#' +
  c
    .slice(0, 3)
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('');

// In-page: list text elements with their composited solid background, or
// null when the background is not a flat colour.
function collect(): Item[] {
  const parse = (value: string): RGBA => {
    const m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) return [0, 0, 0, 0];
    const p = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    return [p[0], p[1], p[2], p[3] ?? 1];
  };
  const items: Item[] = [];
  let id = 0;
  const elements = [...document.querySelectorAll<HTMLElement>('body *')];
  for (const el of elements) {
    const style = getComputedStyle(el);
    const ownText = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent!.trim(),
    );
    const isField =
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
      !!el.placeholder &&
      !el.value;
    if (!ownText && !isField) continue;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height || style.visibility !== 'visible') continue;
    if (el.closest('[hidden], [inert], [aria-hidden="true"]:not(figure)'))
      continue;
    // Chromium may retain rectangles for the hidden content of native details.
    // Open FAQ states are audited separately below.
    if(el.closest('details:not([open])')&&!el.closest('summary'))continue;
    // Behind an open modal the page is inert and not what people read.
    const modal = document.querySelector('dialog[open]');
    if (modal && !modal.contains(el)) continue;
    let opacity = 1;
    for (let node: Element | null = el; node; node = node.parentElement)
      opacity *= Number(getComputedStyle(node).opacity);
    if (opacity < 0.05) continue;
    // Off-screen helpers (honeypot, skip link before focus).
    if (rect.right < 0 || rect.bottom < -2000 || rect.left > innerWidth)
      continue;
    const headerElement=el.closest('body > header, header:has(.main-nav)');
    const header = !!headerElement && getComputedStyle(headerElement).position==='sticky';
    const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r2 = el.getBoundingClientRect();
    const stack = document.elementsFromPoint(
      Math.min(Math.max(r2.left + r2.width / 2, 0), innerWidth - 1),
      r2.top + r2.height / 2,
    );
    const start = stack.indexOf(el);
    let bg: RGBA | null = [0, 0, 0, 0];
    for (const layer of start >= 0 ? stack.slice(start) : [el]) {
      const s = getComputedStyle(layer);
      const tag = layer.tagName.toLowerCase();
      if (
        ['img', 'picture', 'canvas', 'video'].includes(tag) ||
        s.backgroundImage !== 'none' ||
        s.backdropFilter !== 'none' ||
        Number(s.opacity) < 1
      ) {
        bg = null;
        break;
      }
      const c = parse(s.backgroundColor);
      if (c[3] === 0) continue;
      // Composite what we have so far over this layer.
      const a: number = bg[3] + c[3] * (1 - bg[3]);
      bg = [
        (bg[0] * bg[3] + c[0] * c[3] * (1 - bg[3])) / a,
        (bg[1] * bg[3] + c[1] * c[3] * (1 - bg[3])) / a,
        (bg[2] * bg[3] + c[2] * c[3] * (1 - bg[3])) / a,
        a,
      ];
      if (a >= 0.999) break;
    }
    if (bg && bg[3] < 0.999) bg = null;
    void x;
    const fgStyle = isField ? getComputedStyle(el, '::placeholder') : style;
    el.dataset.ccId = String(++id);
    const text = isField
      ? (el as HTMLInputElement).placeholder
      : [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent!.trim())
          .join(' ');
    items.push({
      id,
      label: `${el.tagName.toLowerCase()}${
        el.className && typeof el.className === 'string'
          ? '.' +
            el.className
              .split(' ')
              .filter((c) => !c.startsWith('astro-'))
              .join('.')
          : ''
      } “${text.slice(0, 32)}”`,
      fg: parse(fgStyle.color),
      opacity,
      bg,
      size: parseFloat(style.fontSize),
      weight: Number(style.fontWeight),
      disabled:
        (el as HTMLButtonElement).disabled === true ||
        !!el.closest('[disabled], [aria-disabled="true"]'),
      placeholder: isField,
      header,
    });
  }
  return items;
}

async function backgroundPixels(page: Page, id: number) {
  const locator = page.locator(`[data-cc-id="${id}"]`);
  const padding=await locator.evaluate(el=>{const css=getComputedStyle(el);return {left:parseFloat(css.paddingLeft),right:parseFloat(css.paddingRight),top:parseFloat(css.paddingTop),bottom:parseFloat(css.paddingBottom)};});
  // Hide all text, so overlapping lines of a tight heading are not read as background.
  await page.evaluate(() => document.documentElement.setAttribute('data-cc-hide', ''));
  const png = await locator.screenshot({ animations: 'disabled',timeout:3000 }).catch(async error=>{
    throw new Error(`Contrast pixel target ${id}: ${await locator.evaluate(el=>el.outerHTML.slice(0,400))}`,{cause:error});
  });
  await page.evaluate(() => document.documentElement.removeAttribute('data-cc-hide'));
  const metadata=await sharp(png).metadata();
  const left=Math.min(Math.floor(padding.left),Math.floor(metadata.width!/4));
  const top=Math.min(Math.floor(padding.top),Math.floor(metadata.height!/4));
  const right=Math.min(Math.floor(padding.right),Math.floor(metadata.width!/4));
  const bottom=Math.min(Math.floor(padding.bottom),Math.floor(metadata.height!/4));
  const { data, info } = await sharp(png).extract({left,top,width:metadata.width!-left-right,height:metadata.height!-top-bottom})
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels: number[][] = [];
  for (let i = 0; i < data.length; i += info.channels)
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  return pixels;
}

function worst(fg: RGBA, opacity: number, pixels: number[][]) {
  const scored = pixels
    .map((p) => ({ p, r: ratio(blend(fg, p, fg[3] * opacity), p) }))
    .sort((a, b) => a.r - b.r);
  return scored[Math.floor(scored.length * 0.05)];
}

const states: {
  page: string;
  url: string;
  width: number;
  act?: (p: Page) => Promise<void>;
}[] = [];
for (const locale of ['fr', 'ar'])
  for (const path of [
    '',
    'services/',
    'realisations/',
    'realisations/exemple-villa/',
    'realisations/exemple-terrasse/',
    'contact/',
    'contact/merci/',
    'mentions-legales/',
    'confidentialite/',
  ])
    states.push({
      page: `/${locale}/${path}`,
      url: `/${locale}/${path}`,
      width: 1440,
    });
states.push(
  { page: '/fr/ (390)', url: '/fr/', width: 390 },
  { page: '/ar/ (390)', url: '/ar/', width: 390 },
  {
    page: '/fr/ FAQ open',
    url: '/fr/',
    width: 390,
    act: async (p) => {
      for (const summary of await p.locator('.faq summary').all())
        await summary.click();
    },
  },
  {
    page: '/ar/ FAQ open',
    url: '/ar/',
    width: 390,
    act: async (p) => {
      for (const summary of await p.locator('.faq summary').all())
        await summary.click();
    },
  },
  { page: '404', url: '/fr/page-introuvable/', width: 1440 },
  {
    page: '/fr/contact/ errors',
    url: '/fr/contact/?errors=name,phone,project_type,message&failed=1',
    width: 1440,
  },
  {
    page: '/ar/contact/ errors',
    url: '/ar/contact/?errors=name,phone,project_type,message&failed=1',
    width: 390,
  },
  {
    page: '/fr/ menu open (390)',
    url: '/fr/services/',
    width: 390,
    act: (p) => p.locator('.menu-btn').click(),
  },
  {
    page: '/fr/ lightbox open',
    url: '/fr/realisations/exemple-villa/',
    width: 1440,
    act: (p) => p.locator('project-album a').first().click(),
  },
  {
    page: '/ar/ hotspot open',
    url: '/ar/realisations/exemple-villa/',
    width: 390,
    act: (p) => p.locator('.spot').first().click(),
  },
);

process.env.CONTACT_SIGNING_SECRET = 'local-contrast-audit-secret';
await mkdir('artifacts/phase-6c/contrast', { recursive: true });
const server = await serveBuilt(4180);
const browser = await chromium.launch();
const rows: Row[] = [];
try {
  for (const state of states) {
    const only=process.argv.find(arg=>arg.startsWith('--page='))?.slice(7);
    if(only&&state.url!==only)continue;
    const page = await browser.newPage({
      viewport: { width: state.width, height: 900 },
    });
    await page.goto(server.url + state.url);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content:
        '[data-cc-hide], [data-cc-hide] * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } [data-cc-hide]::placeholder { color: transparent !important; } *, *::before, *::after { caret-color: transparent !important; }',
    });
    if (state.act) {
      await state.act(page);
      await page.waitForTimeout(400);
    }
    const items = await page.evaluate(collect);
    for (const item of items) {
      const large =
        item.size >= 24 || (item.size >= 18.66 && item.weight >= 700);
      const base = {
        page: state.page,
        label: item.label,
        large,
        disabled: item.disabled,
        placeholder: item.placeholder,
      };
      if (item.header) {
        // Sampled behind the translucent header at five scroll positions.
        const height = await page.evaluate(
          () => document.documentElement.scrollHeight - innerHeight,
        );
        let low: { p: number[]; r: number } | undefined;
        for (const f of [0, 0.25, 0.5, 0.75, 1]) {
          await page.evaluate(
            (y) => scrollTo({ top: y, behavior: 'instant' }),
            height * f,
          );
          await page.waitForTimeout(60);
          const opaque = item.bg && item.opacity === 1;
          const sample = opaque
            ? {
                p: item.bg!.slice(0, 3),
                r: ratio(blend(item.fg, item.bg!), item.bg!),
              }
            : worst(
                item.fg,
                item.opacity,
                await backgroundPixels(page, item.id),
              );
          if (!low || sample.r < low.r) low = sample;
          if (opaque) break;
        }
        rows.push({
          ...base,
          fg: hex(item.fg),
          bg: hex(low!.p),
          ratio: low!.r,
          method: item.bg && item.opacity === 1 ? 'solid' : 'header-scroll',
        });
      } else if (item.bg && item.opacity === 1 && !item.disabled) {
        rows.push({
          ...base,
          fg: hex(blend(item.fg, item.bg)),
          bg: hex(item.bg),
          ratio: ratio(blend(item.fg, item.bg), item.bg),
          method: 'solid',
        });
      } else {
        const low = worst(
          item.fg,
          item.opacity,
          await backgroundPixels(page, item.id),
        );
        rows.push({
          ...base,
          fg: hex(blend(item.fg, low.p, item.fg[3] * item.opacity)),
          bg: hex(low.p),
          ratio: low.r,
          method: 'pixels',
        });
      }
    }
    await page.close();
  }
  await writeFile(
    'artifacts/phase-6c/contrast/contrast.json',
    JSON.stringify(rows, null, 1),
  );

  // One table row per distinct colour pair and text size class.
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = `${row.fg}|${row.bg}|${row.large}|${row.method}|${row.disabled}|${row.placeholder}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const lines = [
    '| Text | Background | Size | Ratio | Needs | Result | Measured by | Example (page) |',
    '|---|---|---|---|---|---|---|---|',
  ];
  const sorted = [...groups.values()].sort(
    (a, b) =>
      Math.min(...a.map((r) => r.ratio)) - Math.min(...b.map((r) => r.ratio)),
  );
  for (const group of sorted) {
    const low = group.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
    const needs = low.large ? 3 : 4.5;
    const result = low.disabled
      ? 'exempt (disabled)'
      : low.ratio >= needs
        ? 'pass'
        : '**FAIL**';
    lines.push(
      `| \`${low.fg}\`${low.placeholder ? ' placeholder' : ''} | \`${low.bg}\` | ${low.large ? 'large' : 'normal'} | ${low.ratio.toFixed(2)} | ${needs} | ${result} | ${low.method} | ${low.label.replace(/\|/g, '/')} (${low.page}; ${group.length} elements) |`,
    );
  }
  await writeFile(
    'artifacts/phase-6c/contrast/contrast.md',
    lines.join('\n') + '\n',
  );
  const failures = rows.filter(
    (r) => !r.disabled && r.ratio < (r.large ? 3 : 4.5),
  );
  console.log(
    `${rows.length} text elements, ${groups.size} colour pairs, ${failures.length} failures`,
  );
  for (const f of failures.slice(0, 40))
    console.log(
      `FAIL ${f.ratio.toFixed(2)} ${f.fg} on ${f.bg} ${f.label} (${f.page}, ${f.method})`,
    );
  if(failures.length)process.exitCode=1;
} finally {
  await browser.close();
  await server.close();
}
