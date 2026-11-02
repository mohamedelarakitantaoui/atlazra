import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

type Route = {
  src?: string;
  dest?: string;
  status?: number;
  headers?: Record<string, string>;
  handle?: string;
  continue?: boolean;
};
type Handler = (request: IncomingMessage, response: ServerResponse) => void;

/**
 * Local-only production-output server for tests and audits, not deployment.
 * It follows the route table Vercel generated in `.vercel/output/config.json`:
 * redirects, then static files, then the `_render` function or the 404 page.
 */
export async function serveBuilt(
  port = 4173,
  extra: Record<string, Handler> = {},
) {
  const output = resolve('.vercel/output');
  const root = resolve(output, 'static');
  const { routes } = JSON.parse(
    await readFile(resolve(output, 'config.json'), 'utf8'),
  ) as { routes: Route[] };
  const entry = pathToFileURL(
    resolve(output, 'functions/_render.func/dist/server/entry.mjs'),
  ).href;
  const { default: render } = await import(entry);
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
  async function staticFile(pathname: string) {
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) return undefined;
    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      return { file, source: await readFile(file) };
    } catch {
      return undefined;
    }
  }
  function send(
    request: IncomingMessage,
    response: ServerResponse,
    pathname: string,
    found: { file: string; source: Buffer },
    status = 200,
  ) {
    const extension = extname(found.file);
    const compress =
      /gzip/.test(request.headers['accept-encoding'] ?? '') &&
      ['.html', '.js', '.css', '.svg', '.json'].includes(extension);
    response.writeHead(status, {
      'Content-Type': types[extension] ?? 'application/octet-stream',
      'Cache-Control': pathname.startsWith('/_astro/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
      Vary: 'Accept-Encoding',
      ...(compress ? { 'Content-Encoding': 'gzip' } : {}),
    });
    response.end(compress ? gzipSync(found.source) : found.source);
  }
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url ?? '/', 'http://localhost').pathname,
      );
      if (extra[pathname]) return extra[pathname](request, response);
      for (const route of routes) {
        if (route.handle === 'filesystem') {
          const found = await staticFile(pathname);
          if (found) return send(request, response, pathname, found);
          continue;
        }
        const match = route.src && new RegExp(route.src).exec(pathname);
        if (!match || route.continue) continue;
        const location = route.headers?.Location;
        if (location && route.status) {
          const search = request.url?.split('?')[1];
          response.writeHead(route.status, {
            Location:
              location.replace(/\$(\d)/g, (_, n) => match[Number(n)] ?? '') +
              (search ? `?${search}` : ''),
          });
          return response.end();
        }
        if (route.dest?.startsWith('/')) {
          const found = await staticFile(route.dest);
          if (found)
            return send(request, response, pathname, found, route.status);
        } else if (route.dest) {
          request.headers['x-forwarded-proto'] = 'http';
          return await render(request, response);
        }
      }
      response.writeHead(404).end('Not found');
    } catch {
      if (!response.headersSent) response.writeHead(500);
      response.end();
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
