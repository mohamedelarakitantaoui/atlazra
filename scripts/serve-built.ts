import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

/** Local-only production-output server for reproducible audits, not deployment. */
export async function serveBuilt(port = 4173) {
  const root = resolve('.vercel/output/static');
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain',
    '.xml': 'application/xml',
  };
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url ?? '/', 'http://localhost').pathname,
      );
      let file = resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + sep)) {
        response.writeHead(403).end();
        return;
      }
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      const source = await readFile(file);
      const extension = extname(file);
      const compress =
        /gzip/.test(request.headers['accept-encoding'] ?? '') &&
        ['.html', '.js', '.css', '.svg', '.json'].includes(extension);
      response.writeHead(200, {
        'Content-Type': types[extension] ?? 'application/octet-stream',
        'Cache-Control': pathname.startsWith('/_astro/')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
        Vary: 'Accept-Encoding',
        ...(compress ? { 'Content-Encoding': 'gzip' } : {}),
      });
      response.end(compress ? gzipSync(source) : source);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const server = await serveBuilt(Number(process.env.PORT ?? 4173));
  console.log(`Built site: ${server.url}`);
}
