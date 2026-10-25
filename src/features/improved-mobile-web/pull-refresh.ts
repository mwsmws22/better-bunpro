/**
 * The review document is locked to the screen, and the Bunpro app window's
 * layout viewport is taller than the screen, so unlocking the root to let
 * Firefox refresh from an overscroll leaves a pannable gap under the answer
 * bar. A pull down from the top of the prompt reloads the page instead.
 *
 * Firefox cancels the pointer as soon as a pull starts to move, but keeps
 * sending touch events, so the pull follows the touch.
 */

export const PULL_INDICATOR_ID = 'bb-pull-refresh';
export const PULL_READY_CLASS = 'bb-pull-ready';
export const PULL_REFRESHING_CLASS = 'bb-pull-refreshing';

/** A short tug at the top is a scroll, not a refresh. */
export const PULL_REFRESH_PX = 80;
/** The indicator trails the finger so it reads as a pull, not a drag. */
const INDICATOR_TRAVEL = 0.6;

export const reviewPage = {
  reload(): void {
    location.reload();
  },
};

interface PromptPull {
  touchId: number;
  startY: number;
  section: HTMLElement;
  distance: number;
}

let pull: PromptPull | null = null;

/** The pull counts only while the prompt is scrolled to its top. */
export function beginPull(touch: Touch, section: HTMLElement): void {
  pull = null;
  if (section.scrollTop > 0) {
    return;
  }
  pull = { touchId: touch.identifier, startY: touch.clientY, section, distance: 0 };
}

export function followPull(event: TouchEvent): void {
  const touch = pull && findTouch(event.changedTouches, pull.touchId);
  if (!pull || !touch) {
    return;
  }
  if (event.touches.length > 1 || pull.section.scrollTop > 0) {
    cancelPull();
    return;
  }
  pull.distance = touch.clientY - pull.startY;
  showPullProgress(pull.distance);
}

export function finishPull(event: TouchEvent): void {
  if (!pull || !findTouch(event.changedTouches, pull.touchId)) {
    return;
  }
  const pulledFar = event.type === 'touchend' && pull.distance >= PULL_REFRESH_PX;
  pull = null;
  if (!pulledFar) {
    hideIndicator();
    return;
  }
  indicator().classList.add(PULL_REFRESHING_CLASS);
  reviewPage.reload();
}

export function cancelPull(): void {
  pull = null;
  hideIndicator();
}

function findTouch(touches: TouchList, id: number): Touch | null {
  return Array.from(touches).find((touch) => touch.identifier === id) ?? null;
}

function showPullProgress(distance: number): void {
  if (distance <= 0) {
    hideIndicator();
    return;
  }
  const progress = Math.min(distance / PULL_REFRESH_PX, 1);
  const el = indicator();
  el.style.transform = `translate(-50%, ${Math.min(distance, PULL_REFRESH_PX) * INDICATOR_TRAVEL}px) rotate(${progress * 270}deg)`;
  el.style.opacity = String(progress);
  el.classList.toggle(PULL_READY_CLASS, progress >= 1);
}

function indicator(): HTMLElement {
  const existing = document.getElementById(PULL_INDICATOR_ID);
  if (existing) {
    return existing;
  }
  const el = document.createElement('div');
  el.id = PULL_INDICATOR_ID;
  el.setAttribute('aria-hidden', 'true');
  el.textContent = '↻';
  document.body.append(el);
  return el;
}

function hideIndicator(): void {
  document.getElementById(PULL_INDICATOR_ID)?.remove();
}
