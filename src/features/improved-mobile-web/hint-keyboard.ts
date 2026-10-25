import { watchBodyRemounts } from '../../dom/remount';
import { findAnswerInput, findSubmitButton } from '../../bunpro/quiz-dom';
import { reviewKey } from '../../bunpro/review';
import { readQuizState, watchQuizState } from '../../bunpro/quiz-state';
import { MOBILE_WEB_CLASS } from './mobile-gate';

const HINT_BUTTON = 'button[title="Toggle the hint level"]';

/**
 * Gap that means a keyboard is covering the page. A phone shrinks
 * visualViewport below innerHeight. The mobile simulator shrinks the iframe
 * instead, so the tallest frame height seen this session is the uncovered page.
 */
const KEYBOARD_COVER_GAP_PX = 120;
/** Above this, screen.height is a desktop monitor, not a spoofed phone. */
const PHONE_SCREEN_MAX_PX = 1000;
/**
 * A portrait phone page is about twice as tall as it is wide. The simulator
 * shrinks the iframe for its keyboard without shrinking visualViewport, and
 * the script often starts after that shrink, so a short frame is the keyboard.
 */
const PORTRAIT_MIN_RATIO = 1.65;

/** If the submit click never arrives, drop the hold so Back can blur. */
const SUBMIT_HOLD_FALLBACK_MS = 700;

let onHintPointerDown: ((event: Event) => void) | null = null;
let onHintClick: ((event: Event) => void) | null = null;
let onAnswerKeyDown: ((event: KeyboardEvent) => void) | null = null;
let onSubmitPointerUp: ((event: Event) => void) | null = null;
let onSubmitPointerCancel: ((event: Event) => void) | null = null;
let onFrameResize: (() => void) | null = null;
let releaseFocusHold: (() => void) | null = null;
let submitHolding = false;
let submitHold: (() => void) | null = null;
let submitHoldFallback: ReturnType<typeof setTimeout> | null = null;
let stopWatchingQuiz: (() => void) | null = null;
let stopWatchingInput: (() => void) | null = null;
let openedReview: string | null = null;
let tallestFrame = 0;

/**
 * Hint taps and submits leave the keyboard where it is. While it covers the
 * page, the answer field keeps focus so the keyboard stays up. While it is
 * hidden, a hint or submit must not focus the field. A new review focuses the
 * field once, which opens the keyboard. The back gesture blurs it, and that
 * dismissal stands until the next review or a full page load.
 */
export function startHintKeyboardHold(): void {
  if (onHintPointerDown) {
    return;
  }
  onHintPointerDown = (event: Event) => {
    if (holdHintKeyboard(event.target)) {
      return;
    }
    holdSubmitKeyboard(event.target);
  };
  onHintClick = (event: Event) => {
    if (isMobileHint(event.target)) {
      releaseSoon();
      return;
    }
    releaseSubmitHoldAfterClick(event.target);
  };
  onAnswerKeyDown = holdSubmitOnEnter;
  onSubmitPointerUp = (event: Event) => {
    if (!submitHolding || isSubmitControl(event.target)) {
      return;
    }
    releaseSubmitHold();
  };
  onSubmitPointerCancel = () => {
    releaseSubmitHold();
  };
  onFrameResize = () => {
    tallestFrame = Math.max(tallestFrame, pageHeight());
  };
  onFrameResize();
  window.addEventListener('resize', onFrameResize);
  document.addEventListener('pointerdown', onHintPointerDown, true);
  document.addEventListener('pointerup', onSubmitPointerUp, true);
  document.addEventListener('pointercancel', onSubmitPointerCancel, true);
  document.addEventListener('click', onHintClick);
  document.addEventListener('keydown', onAnswerKeyDown, true);
  stopWatchingQuiz = watchQuizState(() => {
    openAnswerKeyboardForReview();
  });
  stopWatchingInput = watchBodyRemounts(() => {
    openAnswerKeyboardForReview();
  });
  openAnswerKeyboardForReview();
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
  if (onAnswerKeyDown) {
    document.removeEventListener('keydown', onAnswerKeyDown, true);
    onAnswerKeyDown = null;
  }
  if (onSubmitPointerUp) {
    document.removeEventListener('pointerup', onSubmitPointerUp, true);
    onSubmitPointerUp = null;
  }
  if (onSubmitPointerCancel) {
    document.removeEventListener('pointercancel', onSubmitPointerCancel, true);
    onSubmitPointerCancel = null;
  }
  stopWatchingQuiz?.();
  stopWatchingQuiz = null;
  stopWatchingInput?.();
  stopWatchingInput = null;
  openedReview = null;
  clearSubmitHoldFallback();
  submitHolding = false;
  submitHold = null;
  releaseFocusHold?.();
  releaseFocusHold = null;
  if (onFrameResize) {
    window.removeEventListener('resize', onFrameResize);
    onFrameResize = null;
  }
  tallestFrame = 0;
}

function holdHintKeyboard(target: EventTarget | null): boolean {
  if (!isMobileHint(target)) {
    return false;
  }
  const input = findAnswerInput();
  if (!input) {
    return true;
  }
  if (keyboardCoversPage()) {
    holdAnswerFocused(input);
    return true;
  }
  holdAnswerUnfocused(input);
  return true;
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

/**
 * Tapping submit moves focus onto the button and the soft keyboard drops.
 * Hold the field through that tap when the keyboard is already up, for an
 * empty answer and for a graded one, then let the hold go so Back can blur.
 */
function holdSubmitKeyboard(target: EventTarget | null): void {
  if (!isSubmitControl(target)) {
    return;
  }
  if (!retainAnswerKeyboard()) {
    return;
  }
  submitHolding = true;
  submitHold = releaseFocusHold;
  clearSubmitHoldFallback();
  submitHoldFallback = setTimeout(() => {
    submitHoldFallback = null;
    releaseSubmitHold();
  }, SUBMIT_HOLD_FALLBACK_MS);
}

function holdSubmitOnEnter(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || event.repeat) {
    return;
  }
  const input = findAnswerInput();
  if (!input || document.activeElement !== input) {
    return;
  }
  if (!retainAnswerKeyboard()) {
    return;
  }
  releaseSoon();
}

function releaseSubmitHoldAfterClick(target: EventTarget | null): void {
  if (!submitHolding || !isSubmitControl(target)) {
    return;
  }
  const hold = submitHold;
  submitHolding = false;
  submitHold = null;
  clearSubmitHoldFallback();
  // The click mounts the empty-answer popup or grades the answer. Keep the
  // field focused through that, then drop the hold so the back gesture can blur.
  setTimeout(() => {
    if (releaseFocusHold === hold) {
      releaseAnswerKeyboard();
    }
  }, 0);
}

function releaseSubmitHold(): void {
  if (!submitHolding) {
    return;
  }
  const hold = submitHold;
  submitHolding = false;
  submitHold = null;
  clearSubmitHoldFallback();
  if (hold !== null && releaseFocusHold === hold) {
    releaseAnswerKeyboard();
  }
}

function clearSubmitHoldFallback(): void {
  if (submitHoldFallback === null) {
    return;
  }
  clearTimeout(submitHoldFallback);
  submitHoldFallback = null;
}

function isSubmitControl(target: EventTarget | null): boolean {
  return document.documentElement.classList.contains(MOBILE_WEB_CLASS)
    && target instanceof Element
    && findSubmitButton()?.contains(target) === true;
}

/**
 * Focus the answer field once per review so a fresh load, including a refresh,
 * opens the keyboard. Uses the same focus hold as a hint tap, then drops it
 * so a later blur — the back gesture — is not undone.
 */
function openAnswerKeyboardForReview(): void {
  if (!document.documentElement.classList.contains(MOBILE_WEB_CLASS)) {
    return;
  }
  const state = readQuizState();
  if (state.inputMode === 'flashcard') {
    return;
  }
  const key = reviewKey(state);
  if (!key || key === openedReview) {
    return;
  }
  const input = findAnswerInput();
  if (!input || input.disabled) {
    return;
  }
  openedReview = key;
  holdAnswerFocused(input);
  releaseAnswerKeyboard();
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
