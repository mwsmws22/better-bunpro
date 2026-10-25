import { findAnswerInput } from '../../bunpro/quiz-dom';
import { MOBILE_WEB_CLASS } from './mobile-gate';

const HINT_BUTTON = 'button[title="Toggle the hint level"]';

/**
 * Gap that means a keyboard is covering the page. A phone shrinks
 * visualViewport below innerHeight. The mobile simulator shrinks the iframe
 * instead, so the tallest frame height seen this session is the uncovered page.
 */
export const KEYBOARD_COVER_GAP_PX = 120;
/** Above this, screen.height is a desktop monitor, not a spoofed phone. */
const PHONE_SCREEN_MAX_PX = 1000;
/**
 * A portrait phone page is about twice as tall as it is wide. The simulator
 * shrinks the iframe for its keyboard without shrinking visualViewport, and
 * the script often starts after that shrink, so a short frame is the keyboard.
 */
const PORTRAIT_MIN_RATIO = 1.65;

let onHintPointerDown: ((event: Event) => void) | null = null;
let onHintClick: ((event: Event) => void) | null = null;
let onFrameResize: (() => void) | null = null;
let releaseFocusHold: (() => void) | null = null;
let tallestFrame = 0;

/**
 * Hint taps leave the keyboard where it is. While it covers the page, the
 * answer field keeps focus so the keyboard stays up. While it is hidden,
 * Bunpro's hint click must not focus the field, or the keyboard opens and
 * closes again.
 */
export function startHintKeyboardHold(): void {
  if (onHintPointerDown) {
    return;
  }
  onHintPointerDown = (event: Event) => {
    if (!isMobileHint(event.target)) {
      return;
    }
    const input = findAnswerInput();
    if (!input) {
      return;
    }
    if (keyboardCoversPage()) {
      holdAnswerFocused(input);
      return;
    }
    holdAnswerUnfocused(input);
  };
  onHintClick = (event: Event) => {
    if (!isMobileHint(event.target)) {
      return;
    }
    releaseSoon();
  };
  onFrameResize = () => {
    tallestFrame = Math.max(tallestFrame, pageHeight());
  };
  onFrameResize();
  window.addEventListener('resize', onFrameResize);
  document.addEventListener('pointerdown', onHintPointerDown, true);
  document.addEventListener('click', onHintClick);
}

export function stopHintKeyboardHold(): void {
  if (onHintPointerDown) {
    document.removeEventListener('pointerdown', onHintPointerDown, true);
    onHintPointerDown = null;
  }
  if (onHintClick) {
    document.removeEventListener('click', onHintClick);
    onHintClick = null;
  }
  releaseFocusHold?.();
  if (onFrameResize) {
    window.removeEventListener('resize', onFrameResize);
    onFrameResize = null;
  }
  tallestFrame = 0;
}

function isMobileHint(target: EventTarget | null): boolean {
  return document.documentElement.classList.contains(MOBILE_WEB_CLASS)
    && target instanceof Element
    && target.closest(HINT_BUTTON) !== null;
}

function keyboardCoversPage(): boolean {
  const viewport = window.visualViewport?.height ?? window.innerHeight;
  if (window.innerHeight - viewport > KEYBOARD_COVER_GAP_PX) {
    return true;
  }
  if (tallestFrame - pageHeight() > KEYBOARD_COVER_GAP_PX) {
    return true;
  }
  if (phoneScreenGap() > KEYBOARD_COVER_GAP_PX) {
    return true;
  }
  return shrunkPhoneFrame();
}

function shrunkPhoneFrame(): boolean {
  if (isPhoneScreen()) {
    return false;
  }
  const width = pageWidth();
  if (width <= 0 || width > 500) {
    return false;
  }
  return pageHeight() < width * PORTRAIT_MIN_RATIO;
}

function pageWidth(): number {
  return document.documentElement.clientWidth || window.innerWidth;
}

function pageHeight(): number {
  return document.documentElement.clientHeight || window.innerHeight;
}

function isPhoneScreen(): boolean {
  const screenHeight = window.screen?.height ?? 0;
  const screenWidth = window.screen?.width ?? 0;
  return screenHeight > 0
    && screenHeight <= PHONE_SCREEN_MAX_PX
    && screenWidth <= PHONE_SCREEN_MAX_PX;
}

function phoneScreenGap(): number {
  const screenHeight = window.screen?.height ?? 0;
  const screenWidth = window.screen?.width ?? 0;
  if (screenHeight <= 0 || screenHeight > PHONE_SCREEN_MAX_PX || screenWidth > PHONE_SCREEN_MAX_PX) {
    return 0;
  }
  return screenHeight - window.innerHeight;
}

/** The hint button would steal focus and the simulator would hide its keyboard. */
function holdAnswerFocused(input: HTMLInputElement): void {
  releaseFocusHold?.();
  const keep = (event: Event) => {
    if (event.type === 'mousedown') {
      event.preventDefault();
    }
    if (document.activeElement !== input) {
      input.focus();
    }
  };
  document.addEventListener('mousedown', keep, true);
  input.addEventListener('blur', keep, true);
  if (document.activeElement !== input) {
    input.focus();
  }
  releaseFocusHold = () => {
    document.removeEventListener('mousedown', keep, true);
    input.removeEventListener('blur', keep, true);
    releaseFocusHold = null;
  };
}

/** Bunpro calls `input.focus()` from the hint click. Ignore that call. */
function holdAnswerUnfocused(input: HTMLInputElement): void {
  releaseFocusHold?.();
  input.blur();
  Object.defineProperty(input, 'focus', {
    configurable: true,
    value: () => {},
  });
  releaseFocusHold = () => {
    delete (input as { focus?: unknown }).focus;
    releaseFocusHold = null;
  };
}

function releaseSoon(): void {
  setTimeout(() => releaseFocusHold?.(), 0);
}

/** Keep the answer field focused while the keyboard is already up. */
export function retainAnswerKeyboard(): boolean {
  if (!document.documentElement.classList.contains(MOBILE_WEB_CLASS)) {
    return false;
  }
  const input = findAnswerInput();
  if (!input) {
    return false;
  }
  // The simulator can show its keyboard without shrinking the iframe, so a
  // focused answer field is the keyboard being up. A hidden keyboard has
  // left the field.
  if (!keyboardCoversPage() && document.activeElement !== input) {
    return false;
  }
  holdAnswerFocused(input);
  return true;
}

export function releaseAnswerKeyboard(): void {
  releaseFocusHold?.();
}
