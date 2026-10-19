/** Toggled on `<html>` while the feature is active in a mobile context. */
export const MOBILE_WEB_CLASS = 'bb-mobile-web';

/** Bunpro’s `sm:` breakpoint — at or below counts as mobile width. */
export const MOBILE_WIDTH_MAX_PX = 640;

const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

export type MobileGateChange = (active: boolean) => void;

let onChange: MobileGateChange | null = null;
let active = false;
/** False until the first `setActive` after start — so desktop still gets onChange(false). */
let synced = false;

export function isMobileContext(
  width = window.innerWidth,
  userAgent = navigator.userAgent,
): boolean {
  return width <= MOBILE_WIDTH_MAX_PX || MOBILE_UA.test(userAgent);
}

export function startMobileGate(listener: MobileGateChange): void {
  stopMobileGate();
  onChange = listener;
  window.addEventListener('resize', reevaluate);
  reevaluate();
}

export function stopMobileGate(): void {
  window.removeEventListener('resize', reevaluate);
  const listener = onChange;
  onChange = null;
  if (!listener) {
    clearClass();
    return;
  }
  clearClass();
  listener(false);
}

function reevaluate(): void {
  setActive(isMobileContext());
}

function setActive(next: boolean): void {
  const hasClass = document.documentElement.classList.contains(MOBILE_WEB_CLASS);
  if (synced && next === active && next === hasClass) {
    return;
  }
  synced = true;
  active = next;
  document.documentElement.classList.toggle(MOBILE_WEB_CLASS, next);
  onChange?.(next);
}

function clearClass(): void {
  active = false;
  synced = false;
  document.documentElement.classList.remove(MOBILE_WEB_CLASS);
}
