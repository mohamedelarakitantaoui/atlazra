import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { serveBuilt } from './serve-built.ts';
import type { GardenScene } from '../src/components/garden/scene.ts';
import {
  HARDWARE_GPU,
  disableFrameGuard,
  reportRenderer,
} from '../tests/renderer.ts';

type Model = HTMLElement & { diagnostics: ReturnType<GardenScene['snapshot']> };
const directory = 'test-results/phase-4-performance';
await mkdir(directory, { recursive: true });
const server = await serveBuilt(4175);
const browser = await chromium.launch({
  args: ['--remote-debugging-port=9223'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  // Force the live scene so the drag trace still measures it (on SwiftShader).
  await reportRenderer(page, HARDWARE_GPU);
  await disableFrameGuard(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${server.url}/fr/`);
  await page
    .locator('garden-model[data-status="ready"]')
    .waitFor({ timeout: 60000 });
  await page.waitForFunction(
    () => !(document.querySelector('garden-model') as Model).diagnostics.moving,
    undefined,
    { timeout: 30000 },
  );
  const surface = page.locator('garden-model .surface');
  await surface.scrollIntoViewIfNeeded();
  const box = (await surface.boundingBox())!;
  const gpu = await page.locator('garden-model canvas').evaluate((el) => {
    const context = (el as HTMLCanvasElement).getContext('webgl2')!;
    const extension = context.getExtension('WEBGL_debug_renderer_info');
    return extension
      ? context.getParameter(extension.UNMASKED_RENDERER_WEBGL)
      : context.getParameter(context.RENDERER);
  });
  await cdp.send('Tracing.start', {
    categories:
      'devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline',
    transferMode: 'ReturnAsStream',
  });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const measurement = page.evaluate(
    () =>
      new Promise<{
        intervals: number[];
        longTasks: { startTime: number; duration: number }[];
      }>((resolve) => {
        const intervals: number[] = [],
          longTasks: { startTime: number; duration: number }[] = [];
        const observer = new PerformanceObserver((list) =>
          list.getEntries().forEach((entry) =>
            longTasks.push({
              startTime: entry.startTime,
              duration: entry.duration,
            }),
          ),
        );
        observer.observe({ type: 'longtask' });
        const start = performance.now();
        let previous = start;
        const frame = (now: number) => {
          intervals.push(now - previous);
          previous = now;
          if (now - start < 5000) requestAnimationFrame(frame);
          else {
            observer.disconnect();
            resolve({ intervals, longTasks });
          }
        };
        requestAnimationFrame(frame);
      }),
  );
  const start = performance.now();
  while (performance.now() - start < 5000) {
    const elapsed = performance.now() - start;
    await page.mouse.move(
      box.x + box.width / 2 + Math.sin(elapsed / 500) * box.width * 0.3,
      box.y + box.height / 2,
    );
    await delay(16);
  }
  await page.mouse.up();
  const samples = await measurement;
  const completion = new Promise<{ stream?: string }>((resolve) =>
    cdp.once('Tracing.tracingComplete', resolve),
  );
  await cdp.send('Tracing.end');
  const { stream } = await completion;
  if (!stream) throw new Error('Chrome did not return a trace stream');
  const trace: Buffer[] = [];
  for (;;) {
    const data = await cdp.send('IO.read', { handle: stream });
    trace.push(Buffer.from(data.data, data.base64Encoded ? 'base64' : 'utf8'));
    if (data.eof) break;
  }
  await cdp.send('IO.close', { handle: stream });
  await writeFile(`${directory}/drag-trace.json`, Buffer.concat(trace));
  const sorted = samples.intervals.filter((n) => n > 0).sort((a, b) => a - b);
  const percentile = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const metrics = {
    cpuThrottle: 4,
    durationMs: 5000,
    viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
    gpu,
    rafFrames: sorted.length,
    averageFrameMs: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    medianFrameMs: percentile(0.5),
    p95FrameMs: percentile(0.95),
    maxFrameMs: sorted.at(-1),
    framesOver50ms: sorted.filter((n) => n > 50).length,
    longTasksOver50ms: samples.longTasks.filter((task) => task.duration > 50),
    consoleErrors: errors,
  };
  await writeFile(
    `${directory}/drag-metrics.json`,
    JSON.stringify(metrics, null, 2),
  );
  console.log('DRAG', JSON.stringify(metrics));
  await page.close();
  // Lighthouse applies its own standard mobile network/CPU simulation. Its
  // headless Chrome reports SwiftShader, so it measures the poster, not the scene.
  const summary: Record<string, unknown> = {};
  for (const locale of ['fr', 'ar']) {
    const result = await lighthouse(`${server.url}/${locale}/`, {
      port: 9223,
      logLevel: 'error',
      output: ['json', 'html'],
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    if (!result) throw new Error('Lighthouse returned no result');
    const reports = result.report as string[];
    await writeFile(`${directory}/lighthouse-${locale}.json`, reports[0]);
    await writeFile(`${directory}/lighthouse-${locale}.html`, reports[1]);
    const requests = result.lhr.audits['network-requests'].details as {
      items: { url: string }[];
    };
    summary[locale] = {
      lighthouseVersion: result.lhr.lighthouseVersion,
      scores: Object.fromEntries(
        Object.entries(result.lhr.categories).map(([key, value]) => [
          key,
          Math.round((value.score ?? 0) * 100),
        ]),
      ),
      lcpMs: result.lhr.audits['largest-contentful-paint'].numericValue,
      tbtMs: result.lhr.audits['total-blocking-time'].numericValue,
      cls: result.lhr.audits['cumulative-layout-shift'].numericValue,
      sceneLoaded: requests.items.some((item) => /\/scene\./.test(item.url)),
      runtimeError: result.lhr.runtimeError,
    };
  }
  await writeFile(
    `${directory}/lighthouse-summary.json`,
    JSON.stringify(summary, null, 2),
  );
  console.log('LIGHTHOUSE', JSON.stringify(summary));
} finally {
  await browser.close();
  await server.close();
}
