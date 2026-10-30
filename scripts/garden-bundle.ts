import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const directory = '.vercel/output/static/_astro';
const files = (await readdir(directory)).filter((name) => name.endsWith('.js'));
// Conservative gate: include ALL emitted site JS, so shared dependencies cannot
// accidentally be omitted from the island budget.
const chunks = await Promise.all(
  files.map(async (name) => {
    const source = await readFile(`${directory}/${name}`);
    return { name, bytes: source.length, gzipBytes: gzipSync(source).length };
  }),
);
const gzipBytes = chunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);
const report = { chunks, totalGzipBytes: gzipBytes, limitBytes: 200_000 };
await mkdir('test-results', { recursive: true });
await writeFile(
  'test-results/garden-bundle.json',
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (gzipBytes >= 200_000)
  throw new Error('Garden/site JavaScript exceeds 200 KB gzip');
