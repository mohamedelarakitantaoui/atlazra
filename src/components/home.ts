// The plan remains readable without JavaScript. Its seven buttons share one
// selection state, whether reached by pointer, keyboard, or touch.
const plan = document.querySelector('#plan');
if (plan) {
  const select = (key: string) =>
    plan.querySelectorAll<HTMLElement>('[data-k]').forEach((el) => {
      const active = el.dataset.k === key;
      el.classList.toggle('on', active);
      (el.matches('button') ? el : el.querySelector('button'))?.setAttribute(
        'aria-pressed',
        String(active),
      );
    });
  plan.querySelectorAll<HTMLElement>('[data-k]').forEach((el) => {
    const button = el.matches('button') ? el : el.querySelector('button')!;
    for (const type of ['focus', 'click'])
      button.addEventListener(type, () => select(el.dataset.k!));
    // A focus scroll can move a different pin under a stationary mouse. Only
    // actual pointer movement should override the keyboard's selection.
    button.addEventListener('pointermove', (event) => {
      const pointerEvent = event as PointerEvent;
      if (pointerEvent.movementX || pointerEvent.movementY)
        select(el.dataset.k!);
    });
  });
  select('pool');
}
const compare = document.querySelector<HTMLElement>('#compare');
const range = compare?.querySelector<HTMLInputElement>('input[type="range"]');
if (compare && range) {
  const update = () => compare.style.setProperty('--split', `${range.value}%`);
  range.addEventListener('input', update);
  // Native range inputs support keyboards and screen readers. Pointer capture
  // gives the full image a 1:1 draggable wipe, including touch devices.
  let pointer: number | null = null;
  const move = (event: PointerEvent) => {
    const box = compare.getBoundingClientRect();
    const fraction = Math.max(
      0,
      Math.min(1, (event.clientX - box.left) / box.width),
    );
    range.value = String(
      Math.round(
        (document.documentElement.dir === 'rtl' ? 1 - fraction : fraction) *
          100,
      ),
    );
    update();
  };
  compare.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    pointer = event.pointerId;
    range.focus({ preventScroll: true });
    compare.setPointerCapture(pointer);
    move(event);
  });
  compare.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointer) move(event);
  });
  const release = () => {
    pointer = null;
  };
  compare.addEventListener('pointerup', release);
  compare.addEventListener('pointercancel', release);
}
