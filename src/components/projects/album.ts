class ProjectAlbum extends HTMLElement {
  private cleanup?: () => void;
  connectedCallback() {
    const dialog = this.querySelector('dialog')!;
    const viewport = this.querySelector<HTMLElement>('.viewport')!;
    const track = this.querySelector<HTMLElement>('.slides')!;
    const slides = [...this.querySelectorAll<HTMLElement>('.slide')];
    const thumbnails = [
      ...this.querySelectorAll<HTMLAnchorElement>('.thumbnail'),
    ];
    const previous = this.querySelector<HTMLButtonElement>('.previous')!;
    const next = this.querySelector<HTMLButtonElement>('.next')!;
    const sign = document.dir === 'rtl' ? 1 : -1;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const abort = new AbortController();
    const options = { signal: abort.signal };
    let index = 0,
      position = 0,
      velocity = 0,
      frame = 0;
    let pointer: number | undefined;
    let origin = 0,
      originPosition = 0,
      lastX = 0,
      lastTime = 0,
      lastMovement = 0;
    let returnTo: HTMLElement | undefined;
    let oldOverflow = '';
    const width = () => viewport.clientWidth;
    const paint = () => {
      track.style.transform = `translateX(${sign * position}px)`;
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const announce = () => {
      this.querySelector('.counter')!.textContent =
        `${index + 1} / ${slides.length}`;
      previous.disabled = index === 0;
      next.disabled = index === slides.length - 1;
      slides.forEach((slide, i) => {
        slide.inert = i !== index;
        slide.setAttribute('aria-hidden', String(i !== index));
      });
    };
    const settle = (targetIndex: number, initialVelocity = 0) => {
      stop();
      index = Math.max(0, Math.min(slides.length - 1, targetIndex));
      announce();
      const target = index * width();
      if (reduced.matches) {
        position = target;
        velocity = 0;
        paint();
        return;
      }
      // Critically damped spring, carrying the measured gesture velocity.
      velocity = initialVelocity;
      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.032);
        last = now;
        const omega = 22;
        const displacement = position - target;
        const c = velocity + omega * displacement;
        const decay = Math.exp(-omega * dt);
        position = target + (displacement + c * dt) * decay;
        velocity = (velocity - omega * c * dt) * decay;
        paint();
        if (Math.abs(position - target) < 0.25 && Math.abs(velocity) < 2) {
          position = target;
          paint();
          frame = 0;
        } else frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const close = () => dialog.close();
    thumbnails.forEach((thumbnail, i) =>
      thumbnail.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          returnTo = thumbnail;
          oldOverflow = document.documentElement.style.overflow;
          document.documentElement.style.overflow = 'hidden';
          dialog.showModal();
          index = i;
          position = i * width();
          paint();
          announce();
          this.querySelector<HTMLButtonElement>('.close')!.focus();
        },
        options,
      ),
    );
    this.querySelector('.close')!.addEventListener('click', close, options);
    dialog.addEventListener(
      'close',
      () => {
        stop();
        pointer = undefined;
        document.documentElement.style.overflow = oldOverflow;
        returnTo?.focus({ preventScroll: true });
      },
      options,
    );
    previous.addEventListener('click', () => settle(index - 1), options);
    next.addEventListener('click', () => settle(index + 1), options);
    dialog.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          settle(index + (event.key === 'ArrowRight' ? -sign : sign));
        }
      },
      options,
    );
    viewport.addEventListener(
      'dragstart',
      (event) => event.preventDefault(),
      options,
    );
    viewport.addEventListener(
      'pointerdown',
      (event) => {
        if (!event.isPrimary || event.button !== 0) return;
        stop();
        pointer = event.pointerId;
        viewport.setPointerCapture(pointer);
        origin = lastX = event.clientX;
        originPosition = position;
        lastTime = lastMovement = performance.now();
        velocity = 0;
      },
      options,
    );
    viewport.addEventListener(
      'pointermove',
      (event) => {
        if (pointer !== event.pointerId) return;
        const now = performance.now();
        velocity =
          ((sign * (event.clientX - lastX)) / Math.max(now - lastTime, 1)) *
          1000;
        lastX = event.clientX;
        lastTime = lastMovement = now;
        const raw = originPosition + sign * (event.clientX - origin);
        const max = (slides.length - 1) * width();
        const bound = Math.max(0, Math.min(max, raw));
        // 1:1 within the album; resistance beyond either end (no bounce in reduce).
        const excess = raw - bound;
        position =
          bound +
          (reduced.matches
            ? 0
            : Math.sign(excess) *
              width() *
              0.2 *
              (1 - Math.exp(-Math.abs(excess) / Math.max(width() * 0.2, 1))));
        paint();
      },
      options,
    );
    const release = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      pointer = undefined;
      if (viewport.hasPointerCapture(event.pointerId))
        viewport.releasePointerCapture(event.pointerId);
      const v =
        reduced.matches ||
        event.type === 'pointercancel' ||
        performance.now() - lastMovement > 100
          ? 0
          : velocity;
      const target = Math.round((position + v * 0.18) / Math.max(width(), 1));
      settle(target, v);
    };
    viewport.addEventListener('pointerup', release, options);
    viewport.addEventListener('pointercancel', release, options);
    viewport.addEventListener('lostpointercapture', release, options);
    window.addEventListener(
      'resize',
      () => {
        if (dialog.open) {
          stop();
          position = index * width();
          paint();
        }
      },
      options,
    );
    this.cleanup = () => {
      stop();
      abort.abort();
      if (dialog.open) {
        dialog.close();
        document.documentElement.style.overflow = oldOverflow;
      }
    };
  }
  disconnectedCallback() {
    this.cleanup?.();
  }
}
customElements.define('project-album', ProjectAlbum);
