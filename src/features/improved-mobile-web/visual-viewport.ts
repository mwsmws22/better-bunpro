export const BB_VV_HEIGHT = '--bb-vv-height';
export const BB_VV_OFFSET_TOP = '--bb-vv-offset-top';

interface VisibleShell {
  height: number;
  offsetTop: number;
}

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

/**
 * Top-aligned review shell. CSS pins the page to this height and shifts it
 * by `offsetTop`, so the answer bar sits at `offsetTop + height`.
 *
 * Emulator Firefox shrinks the layout viewport to the visual viewport and
 * leaves `offsetTop` at 0. The shell is already the area above the keyboard.
 *
 * Phone Firefox leaves the layout viewport tall and overlays the keyboard.
 * `visualViewport` is then shorter than the layout viewport, and `offsetTop`
 * may be non-zero. Publishing that offset as well as the visual height pushes
 * the answer bar past the visual viewport into the keyboard. The visible
 * height is the visual viewport clamped to the layout viewport above the
 * offset, and the shell stays top-aligned.
 */
export function visibleShell(
  layoutHeight: number,
  visualHeight: number,
  visualOffsetTop: number,
): VisibleShell {
  const offsetTop = Math.max(0, visualOffsetTop);
  const height = Math.min(visualHeight, Math.max(0, layoutHeight - offsetTop));
  return { height, offsetTop: 0 };
}

function sync(): void {
  if (!running) {
    return;
  }
  const vv = window.visualViewport;
  const layoutHeight = window.innerHeight;
  const shell = visibleShell(layoutHeight, vv?.height ?? layoutHeight, vv?.offsetTop ?? 0);
  const root = document.documentElement.style;
  root.setProperty(BB_VV_HEIGHT, `${shell.height}px`);
  root.setProperty(BB_VV_OFFSET_TOP, `${shell.offsetTop}px`);
}
