// Only the capability probe runs here. The scene remains a viewport-lazy import
// on the main thread. Initialising a cold software GL driver can take >100 ms;
// doing that in a worker keeps the first screen responsive.
const send=(name:string|null)=>(globalThis as unknown as {postMessage:(value:string|null)=>void}).postMessage(name);
try {
  const gl=new OffscreenCanvas(1,1).getContext('webgl2');
  if(!gl)send(null);
  else {
    const info=gl.getExtension('WEBGL_debug_renderer_info');
    const name=String(gl.getParameter(info?info.UNMASKED_RENDERER_WEBGL:gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    send(name);
  }
}catch {send(null);}
