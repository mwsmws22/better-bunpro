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
  window.addEventListener('scroll', sync);
  sync();
}

export function stopVisualViewportSync(): void {
  const vv = window.visualViewport;
  if (vv) {
    vv.removeEventListener('resize', sync);
    vv.removeEventListener('scroll', sync);
  }
  window.removeEventListener('resize', sync);
  window.removeEventListener('scroll', sync);
  running = false;
  document.documentElement.style.removeProperty(BB_VV_HEIGHT);
  document.documentElement.style.removeProperty(BB_VV_OFFSET_TOP);
  restoreLayoutViewport();
}

/**
 * Top-aligned review shell. CSS pins the page to this height at the top of
 * the viewport. The answer bar sits at `height`.
 *
 * Emulator Firefox shrinks the layout viewport to the visual viewport.
 * Phone Firefox leaves the layout viewport tall and overlays the keyboard,
 * and `visualViewport.offsetTop` is how far the document has scrolled.
 * Shortening or shifting the shell by that offset hides the top of the
 * review and leaves an empty region under the answer bar. The shell uses
 * the visible height only. Document scroll is cleared separately.
 */
export function visibleShell(layoutHeight: number, visualHeight: number): VisibleShell {
  const height = Math.max(0, Math.min(visualHeight, layoutHeight));
  return { height, offsetTop: 0 };
}

/**
 * Bunpro's viewport meta sets `height=device-height`, so the layout viewport
 * is the full screen — taller than the browser window. The page then loads
 * scrolled, and the extra height is the empty region under the answer bar.
 */
export function withoutDeviceHeight(content: string): string {
  return content
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part.toLowerCase() !== 'height=device-height')
    .join(', ');
}

let viewportContent: string | null = null;
let pinningScroll = false;

function sync(): void {
  if (!running) {
    return;
  }
  const vv = window.visualViewport;
  const layoutHeight = window.innerHeight;
  const shell = visibleShell(layoutHeight, vv?.height ?? layoutHeight);
  document.documentElement.style.setProperty(BB_VV_HEIGHT, `${shell.height}px`);
  document.documentElement.style.removeProperty(BB_VV_OFFSET_TOP);
  pinLayoutViewport();
  pinDocumentScroll();
}

function pinLayoutViewport(): void {
  const meta = document.querySelector('meta[name="viewport"]');
  if (!(meta instanceof HTMLMetaElement)) {
    return;
  }
  if (viewportContent === null) {
    viewportContent = meta.content;
  }
  const next = withoutDeviceHeight(viewportContent);
  if (meta.content !== next) {
    meta.content = next;
  }
}

function restoreLayoutViewport(): void {
  const meta = document.querySelector('meta[name="viewport"]');
  if (viewportContent !== null && meta instanceof HTMLMetaElement) {
    meta.content = viewportContent;
  }
  viewportContent = null;
}

function pinDocumentScroll(): void {
  if (pinningScroll) {
    return;
  }
  const scrolling = document.scrollingElement ?? null;
  const moved = (window.scrollX || 0) !== 0
    || (window.scrollY || 0) !== 0
    || (scrolling?.scrollTop || 0) !== 0
    || (scrolling?.scrollLeft || 0) !== 0;
  if (!moved) {
    return;
  }
  pinningScroll = true;
  window.scrollTo(0, 0);
  if (scrolling) {
    scrolling.scrollTop = 0;
    scrolling.scrollLeft = 0;
  }
  pinningScroll = false;
}
