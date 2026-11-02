// Local-only fixture build. Always restore source statuses and the safe build.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';
if (process.env.CI || process.env.VERCEL)
  throw new Error('Example verification is local only.');
const files = ['exemple-villa', 'exemple-terrasse'].map(
  (slug) => `src/content/projects/${slug}/index.md`,
);
const originals = await Promise.all(
  files.map((path) => readFile(path, 'utf8')),
);
if (originals.some((source) => !source.includes('"status": "draft"')))
  throw new Error('Expected draft examples.');
const run = (command, args, env = {}) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', ...env },
    shell: process.platform === 'win32',
  });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} failed`);
};
try {
  for (const [i, file] of files.entries())
    await writeFile(
      file,
      originals[i].replace('"status": "draft"', '"status": "published"'),
    );
  run('pnpm', ['build']);
  run(
    'pnpm',
    [
      'exec',
      'playwright',
      'test',
      'tests/projects.spec.ts',
      '--project=chromium',
      '--workers=2',
    ],
    { PROJECT_EXAMPLES: '1' },
  );
  run('node', ['scripts/audit-projects.ts']);
  // Prove hosted builds exclude even accidentally published example folders.
  run('pnpm', ['build'], { CI: '1' });
  for (const lang of ['fr', 'ar', 'en']) {
    const paths = await readdir(`.vercel/output/static/${lang}/realisations`);
    if (paths.some((path) => path.startsWith('exemple-')))
      throw new Error('Example leaked into hosted build');
  }
  const assets = await readdir('.vercel/output/static/_astro');
  if (assets.some((path) => /^image-[0-7]\./.test(path)))
    throw new Error('Example image leaked into hosted build');
  console.log('Hosted exclusion verified: no example routes or image assets.');
} finally {
  for (const [i, file] of files.entries()) await writeFile(file, originals[i]);
  run('pnpm', ['build']);
}
