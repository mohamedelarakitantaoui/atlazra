import {
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Object3D,
  type Vector3,
} from 'three';
import type { GardenBox, GardenConfig, GardenState, Position } from './config';

interface Spring {
  object: Object3D;
  state: GardenState;
  mode: 'y' | 'all' | 'grow';
  order: number;
  value: number;
  velocity: number;
  target: number;
  start: number;
  base: Vector3;
  y: number;
}
export interface GardenScene {
  ready: Promise<boolean>;
  setState: (state: GardenState) => void;
  dispose: () => void;
  snapshot: () => {
    state: GardenState;
    yaw: number;
    moving: boolean;
    frames: number;
    reducedMotion: boolean;
    disposed: boolean;
    values: number[];
    introMedianMs: number | null;
  };
}

/** Median frame interval above which the intro gives way to the poster. */
const SLOW_FRAME_MS = 40;
const PROBE_FRAMES = 10;

/** Owns all GPU resources, observers and input listeners for one garden. */
export function createGarden(
  surface: HTMLElement,
  canvas: HTMLCanvasElement,
  config: GardenConfig,
  {
    rtl = false,
    onFailure = () => {},
    onSlow = () => {},
    slowFrameMs = SLOW_FRAME_MS,
  }: {
    rtl?: boolean;
    onFailure?: () => void;
    onSlow?: (medianMs: number) => void;
    slowFrameMs?: number;
  } = {},
): GardenScene | null {
  // Probe first: a normal no-WebGL fallback must not emit a renderer error.
  const context = canvas.getContext('webgl2', {
    antialias: true,
    alpha: true,
  });
  if (!context) return null;
  const renderer = new WebGLRenderer({
    canvas,
    context,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const scene = new Scene();
  scene.background = null;
  renderer.setClearColor(0x000000, 0);
  const camera = new PerspectiveCamera(28, 1, 0.1, 300);
  // r149's legacy lighting multiplied these intensities by PI internally.
  scene.add(new HemisphereLight(0xffffff, 0xc9d2c6, 0.7 * Math.PI));
  const sun = new DirectionalLight(0xffffff, 1.7 * Math.PI);
  sun.position.set(14, 26, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -18,
    right: 18,
    top: 18,
    bottom: -18,
    near: 1,
    far: 80,
  });
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 3;
  scene.add(sun);

  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const material = (color: string, roughness = 0.9) => {
    const result = new MeshStandardMaterial({ color, roughness, metalness: 0 });
    materials.add(result);
    return result;
  };
  const mat = {
    white: material('#fbfbf9'),
    soil: material('#cbbd9f'),
    lawn: material('#a8c693'),
    hedge: material('#5f8a5a'),
    trunk: material('#8b7b66'),
    stone: material('#ebe5d8'),
    deck: material('#cdb894'),
    water: material('#9fcfd6', 0.25),
    pink: material('#d991a8'),
    cream: material('#f3e3b5'),
    stake: material('#d98b4a'),
    rock: material('#bdb6a7'),
  };
  const world = new Group();
  scene.add(world);
  const add = (
    geometry: BufferGeometry,
    m: Material,
    position: Position,
    parent: Object3D = world,
  ) => {
    geometries.add(geometry);
    materials.add(m);
    const mesh = new Mesh(geometry, m);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (data: GardenBox, m: Material, parent: Object3D = world) =>
    add(new BoxGeometry(...data.size), m, data.position, parent);
  const catcher = add(
    new PlaneGeometry(200, 200),
    new ShadowMaterial({ opacity: 0.1 }),
    [0, -config.plot.plinthHeight, 0],
    scene,
  );
  catcher.rotation.x = -Math.PI / 2;
  catcher.castShadow = false;
  box(
    {
      size: [
        config.plot.width + 1,
        config.plot.plinthHeight,
        config.plot.depth + 1,
      ],
      position: [0, -config.plot.plinthHeight / 2, 0],
    },
    mat.white,
  );
  box(
    {
      size: [config.plot.width, 0.04, config.plot.depth],
      position: [0, 0.02, 0],
    },
    mat.soil,
  );
  box(config.house.body, mat.white);
  box(config.house.roof, mat.white);
  box(config.house.window, material('#c9d3d0', 0.3));

  const springs: Spring[] = [];
  const item = (
    object: Object3D,
    state: GardenState,
    mode: Spring['mode'],
    order: number,
  ) => {
    springs.push({
      object,
      state,
      mode,
      order,
      value: 0,
      velocity: 0,
      target: 0,
      start: 0,
      base: object.scale.clone(),
      y: object.position.y,
    });
    return object;
  };
  const groupAt = (position: Position) => {
    const group = new Group();
    group.position.set(...position);
    world.add(group);
    return group;
  };
  config.states.current.stakes.forEach(({ x, z }, i) => {
    const group = groupAt([x, 0, z]);
    add(
      new CylinderGeometry(0.06, 0.06, 1.1, 8),
      mat.trunk,
      [0, 0.55, 0],
      group,
    );
    add(
      new CylinderGeometry(0.09, 0.09, 0.18, 8),
      mat.stake,
      [0, 1.1, 0],
      group,
    );
    item(group, 'current', 'all', i);
  });
  config.states.current.rocks.forEach(({ x, z, radius }, i) =>
    item(
      add(new DodecahedronGeometry(radius, 0), mat.rock, [x, radius * 0.5, z]),
      'current',
      'all',
      i + config.states.current.stakes.length,
    ),
  );
  let order = 0;
  const lawn = config.states.project;
  item(
    box(
      {
        size: [
          config.plot.width - lawn.lawnInset * 2,
          lawn.lawnHeight,
          config.plot.depth - lawn.lawnInset * 2,
        ],
        position: [0, lawn.lawnHeight / 2, 0],
      },
      mat.lawn,
    ),
    'project',
    'y',
    order++,
  );
  item(box(config.terrace, mat.deck), 'project', 'y', order++);
  config.path.forEach((stone, i) => {
    const mesh = box(stone, mat.stone);
    mesh.rotation.y = stone.rotation;
    item(mesh, 'project', 'y', order + i * 0.5);
  });
  order += Math.ceil(config.path.length / 2);
  if (config.pool) {
    const pool = groupAt(config.pool.position);
    box(config.pool.coping, mat.white, pool);
    box(config.pool.water, mat.water, pool);
    item(pool, 'project', 'y', order++);
  }
  item(box(config.hedge, mat.hedge), 'project', 'y', order++);
  const pergola = config.pergola;
  const perg = groupAt(pergola.position);
  for (const x of [-pergola.width / 2, pergola.width / 2])
    for (const z of [-pergola.depth / 2, pergola.depth / 2])
      box(
        {
          size: [0.14, pergola.height, 0.14],
          position: [x, pergola.height / 2, z],
        },
        mat.white,
        perg,
      );
  for (let i = 0; i < pergola.slats; i++)
    box(
      {
        size: [pergola.width + 0.4, 0.1, 0.12],
        position: [
          0,
          pergola.height + 0.02,
          -pergola.depth / 2 +
            (i * pergola.depth) / Math.max(1, pergola.slats - 1),
        ],
      },
      mat.white,
      perg,
    );
  item(perg, 'project', 'y', order++);
  config.trees.forEach(({ x, z, radius, color }) => {
    const tree = groupAt([x, 0, z]);
    add(
      new CylinderGeometry(0.1, 0.14, radius * 1.2, 8),
      mat.trunk,
      [0, radius * 0.6, 0],
      tree,
    );
    const foliage = material(color);
    foliage.flatShading = true;
    add(
      new IcosahedronGeometry(radius, 1),
      foliage,
      [0, radius * 1.95, 0],
      tree,
    );
    item(tree, 'project', 'grow', order++);
  });
  const flowerGeometry = new SphereGeometry(0.22, 10, 8);
  geometries.add(flowerGeometry);
  config.beds.forEach(({ x, z, flowers }, j) => {
    const bed = groupAt([x, 0, z]);
    for (let i = 0; i < flowers; i++) {
      const angle = i * 2.4,
        radius = 0.25 + ((i * 37) % 10) / 14;
      add(
        flowerGeometry,
        i % 3 ? mat.pink : mat.cream,
        [Math.cos(angle) * radius, 0.24, Math.sin(angle) * radius * 0.7],
        bed,
      );
    }
    item(bed, 'project', 'all', order + j);
  });

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let reduced = motion.matches,
    disposed = false,
    initialized = false;
  let state: GardenState = 'project';
  let yaw = -0.55,
    omega = 0,
    pointer: number | null = null,
    lastX = 0;
  let history: [number, number][] = [];
  let raf = 0,
    last = 0,
    frames = 0,
    hiddenAt = document.hidden ? performance.now() : 0;
  let introAt = 0,
    introTimer = 0;
  // Frame intervals of the intro growth; null when not measuring.
  let probe: number[] | null = null,
    introMedianMs: number | null = null;
  const cancelIntro = () => {
    clearTimeout(introTimer);
    introTimer = 0;
    introAt = 0;
  };
  const apply = () =>
    springs.forEach((s) => {
      const value = Math.max(0, s.value);
      s.object.visible = value > 0.02;
      if (s.mode === 'y') {
        s.object.scale.set(
          s.base.x,
          s.base.y * Math.max(value, 0.001),
          s.base.z,
        );
        s.object.position.y = s.y * value;
      } else s.object.scale.copy(s.base).multiplyScalar(Math.max(value, 0.001));
    });
  const targets = (next: GardenState, instant: boolean) => {
    const now = performance.now();
    springs.forEach((s) => {
      s.target = s.state === next ? 1 : 0;
      s.start =
        now +
        (s.state === 'project'
          ? next === 'project'
            ? s.order * 45
            : 0
          : next === 'current'
            ? 120 + s.order * 40
            : 0);
      if (instant || reduced) {
        s.value = s.target;
        s.velocity = 0;
      }
    });
    apply();
  };
  const render = () => {
    if (disposed || document.hidden || !initialized) return;
    world.rotation.y = yaw;
    renderer.render(scene, camera);
    frames++;
  };
  const stepSprings = (dt: number, now: number) => {
    let moving = false;
    springs.forEach((s) => {
      if (now < s.start) {
        if (Math.abs(s.target - s.value) > 0.001) moving = true;
        return;
      }
      const damping = s.mode === 'grow' && s.target === 1 ? 0.72 : 1;
      const w = (2 * Math.PI) / 0.45;
      s.velocity +=
        (w * w * (s.target - s.value) - 2 * damping * w * s.velocity) * dt;
      s.value += s.velocity * dt;
      if (
        Math.abs(s.target - s.value) < 0.0005 &&
        Math.abs(s.velocity) < 0.001
      ) {
        s.value = s.target;
        s.velocity = 0;
      } else moving = true;
    });
    apply();
    return moving;
  };
  const frame = (now: number) => {
    raf = 0;
    if (disposed || document.hidden) return;
    if (probe) {
      probe.push(now - last);
      if (probe.length === PROBE_FRAMES) {
        const sorted = probe.sort((a, b) => a - b);
        introMedianMs = (sorted[4] + sorted[5]) / 2;
        probe = null;
        if (introMedianMs > slowFrameMs) {
          onSlow(introMedianMs);
          return;
        }
      }
    }
    const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
    last = now;
    let moving = !reduced && stepSprings(dt, now);
    if (pointer === null && !reduced && Math.abs(omega) > 0.002) {
      yaw += omega * dt;
      omega *= Math.pow(0.998, dt * 1000);
      moving = true;
    } else if (pointer === null) omega = 0;
    render();
    if (moving) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (!raf && initialized && !disposed && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  const scheduleIntro = () => {
    if (!introAt || document.hidden || disposed) return;
    introTimer = window.setTimeout(
      () => {
        cancelIntro();
        targets('project', reduced);
        probe = reduced ? null : [];
        kick();
      },
      Math.max(0, introAt - performance.now()),
    );
  };
  const resize = () => {
    if (disposed) return;
    const { width, height } = surface.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const distance =
      41.4 * Math.max(config.plot.width / 20, config.plot.depth / 14);
    camera.position.set(
      0,
      Math.sin(0.62) * distance,
      Math.cos(0.62) * distance,
    );
    camera.lookAt(0, 0.6, 0);
    render();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(surface);
  const release = (momentum: boolean) => {
    if (pointer === null) return;
    const id = pointer;
    pointer = null;
    surface.classList.remove('dragging');
    if (surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
    if (momentum && !reduced && history.length > 1) {
      const [a, b] = [history[0], history[history.length - 1]];
      const seconds = (b[1] - a[1]) / 1000;
      if (seconds > 0) omega = ((b[0] - a[0]) / seconds) * 0.0085;
    }
    if (!momentum) omega = 0;
    kick();
  };
  surface.addEventListener(
    'pointerdown',
    (e) => {
      if (!initialized || e.button !== 0 || pointer !== null) return;
      pointer = e.pointerId;
      omega = 0;
      lastX = e.clientX;
      history = [[e.clientX, performance.now()]];
      surface.setPointerCapture(e.pointerId);
      surface.classList.add('dragging', 'touched');
    },
    { signal: events.signal },
  );
  surface.addEventListener(
    'pointermove',
    (e) => {
      if (pointer !== e.pointerId) return;
      yaw += (e.clientX - lastX) * 0.0085;
      lastX = e.clientX;
      const now = performance.now();
      history.push([e.clientX, now]);
      history = history.filter(([, time]) => now - time <= 100);
      render();
    },
    { signal: events.signal },
  );
  surface.addEventListener('pointerup', () => release(true), {
    signal: events.signal,
  });
  surface.addEventListener('pointercancel', () => release(false), {
    signal: events.signal,
  });
  surface.addEventListener('lostpointercapture', () => release(false), {
    signal: events.signal,
  });
  surface.addEventListener(
    'keydown',
    (e) => {
      if (
        !initialized ||
        !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
      )
        return;
      e.preventDefault();
      omega = 0;
      const direction = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : -1;
      yaw += direction * (rtl ? -1 : 1) * 0.12;
      surface.classList.add('touched');
      render();
    },
    { signal: events.signal },
  );
  const visibility = () => {
    if (document.hidden) {
      hiddenAt = performance.now();
      clearTimeout(introTimer);
      introTimer = 0;
      release(false);
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      const pause = hiddenAt ? performance.now() - hiddenAt : 0;
      springs.forEach((s) => (s.start += pause));
      if (introAt) introAt += pause;
      hiddenAt = 0;
      scheduleIntro();
      kick();
    }
  };
  document.addEventListener('visibilitychange', visibility, {
    signal: events.signal,
  });
  motion.addEventListener(
    'change',
    () => {
      reduced = motion.matches;
      if (reduced) {
        cancelIntro();
        omega = 0;
        cancelAnimationFrame(raf);
        raf = 0;
        targets(state, true);
        render();
      }
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    'webglcontextlost',
    (e) => {
      e.preventDefault();
      onFailure();
    },
    { signal: events.signal },
  );

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    sun.shadow.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    scene.clear();
  };
  resize();
  world.rotation.y = yaw;
  // Compile all variants before exposing the canvas or enabling controls.
  const ready = renderer
    .compileAsync(scene, camera)
    .then(async () => {
      if (document.hidden && !disposed) {
        await new Promise<void>((resolve) => {
          const visible = () => {
            if (!document.hidden) {
              document.removeEventListener('visibilitychange', visible);
              resolve();
            }
          };
          document.addEventListener('visibilitychange', visible, {
            signal: events.signal,
          });
          events.signal.addEventListener('abort', () => resolve(), {
            once: true,
          });
        });
      }
      if (disposed) {
        cleanup();
        return false;
      }
      initialized = true;
      targets(reduced ? 'project' : 'current', true);
      render();
      if (!reduced) {
        introAt = performance.now() + 500;
        scheduleIntro();
      }
      return true;
    })
    .catch(() => {
      cleanup();
      return false;
    });
  return {
    ready,
    setState(next) {
      if (disposed || !initialized) return;
      state = next;
      cancelIntro();
      targets(next, reduced);
      if (reduced) {
        cancelAnimationFrame(raf);
        raf = 0;
        render();
      } else kick();
    },
    snapshot: () => ({
      state,
      yaw,
      moving: raf !== 0 || introAt !== 0,
      frames,
      reducedMotion: reduced,
      disposed,
      values: springs.map((s) => s.value),
      introMedianMs,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      events.abort();
      resizeObserver.disconnect();
      release(false);
      cancelAnimationFrame(raf);
      raf = 0;
      cancelIntro();
      // Let parallel shader compilation settle before freeing its program handles.
      if (initialized) cleanup();
      else void ready.then(cleanup);
    },
  };
}
