export const BB_VV_HEIGHT = '--bb-vv-height';
export const BB_VV_OFFSET_TOP = '--bb-vv-offset-top';

let running = false;

export function startVisualViewportSync(): void {
  stopVisualViewportSync();
  running = true;
  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
  } else {
    window.addEventListener('resize', sync);
  }
  sync();
}

export function stopVisualViewportSync(): void {
  const vv = window.visualViewport;
  if (vv) {
    vv.removeEventListener('resize', sync);
    vv.removeEventListener('scroll', sync);
  }
  window.removeEventListener('resize', sync);
  running = false;
  document.documentElement.style.removeProperty(BB_VV_HEIGHT);
  document.documentElement.style.removeProperty(BB_VV_OFFSET_TOP);
}

function sync(): void {
  if (!running) {
    return;
  }
  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const offsetTop = vv?.offsetTop ?? 0;
  const root = document.documentElement.style;
  root.setProperty(BB_VV_HEIGHT, `${height}px`);
  root.setProperty(BB_VV_OFFSET_TOP, `${offsetTop}px`);
}
