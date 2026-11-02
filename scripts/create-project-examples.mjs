// Deterministic flat test images, never stock or generated garden photographs.
import { createRequire } from 'node:module';
import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('astro/package.json'))('sharp');
const kinds = [
  'before',
  'render_3d',
  'plan',
  'photo',
  'after',
  'photo',
  'after',
  'photo',
];
const labels = [
  'Terrain',
  'Rendu 3D',
  'Plan',
  'Chantier',
  'Après',
  'Détail portrait',
  'Vue paysage',
  'Détail paysage',
];
for (const [folder, full] of [
  ['exemple-villa', true],
  ['exemple-terrasse', false],
  ['_template', false],
]) {
  const directory = `src/content/projects/${folder}`;
  await mkdir(directory, { recursive: true });
  const indexes = full ? kinds.map((_, i) => i) : [1, 5, 6, 7];
  for (const i of indexes) {
    const [width, height] =
      i === 5 ? [900, 1200] : i === 3 ? [1000, 1200] : [1600, 1000];
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${i % 2 ? '#e7e9e4' : '#f2f3f0'}"/><text x="50%" y="46%" text-anchor="middle" fill="#56615a" font-family="Arial,sans-serif" font-size="32">Photo exemple</text><text x="50%" y="53%" text-anchor="middle" fill="#56615a" font-family="Arial,sans-serif" font-size="22">${labels[i]} · ${width} × ${height}</text></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(`${directory}/image-${i}.png`);
  }
  const localized = (fr, ar, en) => ({ fr, ar, en });
  const data = {
    status: 'draft',
    type: full ? 'villa' : 'terrasse',
    city: 'TODO(client)',
    ...(full ? { surface_m2: 120 } : {}),
    year: 2026,
    sort_order: full ? 1 : 2,
    title: localized(
      'EXEMPLE — à supprimer',
      'مثال — للحذف',
      'EXAMPLE — delete before launch',
    ),
    summary: localized(
      'Exemple de mise en page uniquement. Aucun chantier réel.',
      'مثال لاختبار العرض فقط. ليس مشروعًا حقيقيًا.',
      'Layout example only. This is not a real project.',
    ),
    cover: `./image-${full ? 4 : 1}.png`,
    images: indexes.map((i) => ({
      src: `./image-${i}.png`,
      kind: kinds[i],
      alt: localized(
        `Photo exemple — ${labels[i]}`,
        `صورة توضيحية — ${['الأرض', 'تصميم ثلاثي الأبعاد', 'المخطط', 'الأشغال', 'بعد الأشغال', 'تفصيل عمودي', 'منظر أفقي', 'تفصيل أفقي'][i]}`,
        `Example image — ${['Site', '3D render', 'Plan', 'Work in progress', 'After', 'Portrait detail', 'Landscape view', 'Landscape detail'][i]}`,
      ),
    })),
    ...(full
      ? {
          hotspots: [
            {
              x: 28,
              y: 38,
              label: localized(
                'Élément exemple A',
                'عنصر توضيحي أ',
                'Example element A',
              ),
              image: './image-5.png',
              text: localized(
                'Zone de test du plan. La photo est un simple aplat.',
                'منطقة لاختبار المخطط. الصورة مجرد لون موحد.',
                'Test area on the plan. The image is a plain colour block.',
              ),
            },
            {
              x: 76,
              y: 65,
              label: localized(
                'Élément exemple B',
                'عنصر توضيحي ب',
                'Example element B',
              ),
              text: localized(
                'Exemple sans photo associée.',
                'مثال دون صورة مرفقة.',
                'Example with no associated image.',
              ),
            },
          ],
        }
      : {}),
  };
  const body = ['fr', 'ar', 'en']
    .map(
      (lang) =>
        `## ${lang}\n\n${(full ? ['before', 'design', 'photo', 'after'] : ['design', 'photo', 'after']).map((key) => `### ${key}\n\n${{ fr: 'Ce texte sert uniquement à vérifier la mise en page du récit. Il sera remplacé par la description du projet réel.', ar: 'هذا النص لاختبار عرض مراحل المشروع فقط. سيُستبدل بوصف المشروع الحقيقي.', en: 'This text only tests the story layout. Replace it with a description of the real project.' }[lang]}`).join('\n\n')}`,
    )
    .join('\n\n');
  // JSON is valid YAML, and keeps multilingual frontmatter unambiguous.
  await writeFile(
    `${directory}/index.md`,
    `---\n${JSON.stringify(data, null, 2)}\n---\n\n${body}\n`,
  );
}
