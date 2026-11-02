import type { Page } from '@playwright/test';

export const HARDWARE_GPU = 'ANGLE (Test, Hardware GPU)';
export const SOFTWARE_GPU =
  'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)';

/**
 * Headless Chromium rasterizes WebGL with SwiftShader, which the island treats
 * as a software renderer. Tests choose the reported GPU name explicitly.
 */
export const reportRenderer = (page: Page, name: string|null) =>
  page.addInitScript((name) => {
    // Exercise the real worker probe with the same simulated GL capability as
    // the window. The actual scene still renders on real headless SwiftShader.
    const NativeWorker=window.Worker;
    window.Worker=class extends NativeWorker {
      constructor(url:string|URL,options?:WorkerOptions){
        if(String(url).includes('renderer-probe')){
          const prefix=name===null?'OffscreenCanvas.prototype.getContext=()=>null;':`for(const Context of [WebGLRenderingContext,WebGL2RenderingContext]){const get=Context.prototype.getParameter;Context.prototype.getParameter=function(p){if(p===0x9246||p===0x1f01)return ${JSON.stringify(name)};return get.call(this,p)}};`;
          const wrapped=URL.createObjectURL(new Blob([prefix+`import(${JSON.stringify(String(url))});`],{type:'text/javascript'}));
          super(wrapped,options);
        }else super(url,options);
      }
    };
    const UNMASKED_RENDERER = 0x9246,
      RENDERER = 0x1f01;
    for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = context.prototype.getParameter;
      context.prototype.getParameter = function (
        this: WebGLRenderingContext,
        parameter: number,
      ) {
        if (parameter === UNMASKED_RENDERER || parameter === RENDERER)
          return name;
        return Reflect.apply(original, this, [parameter]);
      } as typeof original;
    }
  }, name);

/**
 * SwiftShader intro frames sit near the 40 ms budget, so the frame-time guard
 * would fire at random. Tests that need the live scene switch it off.
 */
export const disableFrameGuard = (page: Page) =>
  page.addInitScript(() =>
    document.addEventListener('DOMContentLoaded', () =>
      document
        .querySelectorAll('garden-model')
        .forEach((model) =>
          model.setAttribute('data-slow-frame-ms', 'Infinity'),
        ),
    ),
  );
