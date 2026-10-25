import { findQuestionSection } from '../../bunpro/quiz-dom';
import { releaseAnswerKeyboard, retainAnswerKeyboard } from './hint-keyboard';
import { MOBILE_WEB_CLASS } from './mobile-gate';

/** On `<html>` while the prompt section is scrolling, so its scrollbar can show. */
export const PROMPT_SCROLLING_CLASS = 'bb-prompt-scrolling';

const SCROLLBAR_HOLD_MS = 700;
/** Ignore a tap that only jitters. The simulator uses the same threshold. */
const DRAG_START_PX = 5;
/** A short tug at the top is a scroll, not a refresh. */
const PULL_REFRESH_PX = 80;

/** The document does not scroll, so a pull from the top reloads through here. */
export const reviewPage = {
  reload(): void {
    location.reload();
  },
};

let onScroll: ((event: Event) => void) | null = null;
let onPointerDown: ((event: PointerEvent) => void) | null = null;
let onPointerMove: ((event: PointerEvent) => void) | null = null;
let onPointerUp: ((event: PointerEvent) => void) | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let drag: PromptDrag | null = null;
let keyboardHoldPointer: number | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
let releaseOnClick: (() => void) | null = null;
let pull: PromptPull | null = null;

interface PromptPull {
  pointerId: number;
  startY: number;
  section: HTMLElement;
}

interface PromptDrag {
  pointerId: number;
  startY: number;
  lastY: number;
  section: HTMLElement;
  active: boolean;
}

export function startPromptScroll(): void {
  if (onScroll) {
    return;
  }
  onScroll = (event: Event) => {
    if (!document.documentElement.classList.contains(MOBILE_WEB_CLASS)) {
      return;
    }
    if (event.target !== findQuestionSection()) {
      return;
    }
    showScrollbar();
  };
  onPointerDown = startPromptDrag;
  onPointerMove = movePromptDrag;
  onPointerUp = endPromptDrag;
  document.addEventListener('scroll', onScroll, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerup', onPointerUp, true);
  document.addEventListener('pointercancel', onPointerUp, true);
}

export function stopPromptScroll(): void {
  if (onScroll) {
    document.removeEventListener('scroll', onScroll, true);
    onScroll = null;
  }
  if (onPointerDown) {
    document.removeEventListener('pointerdown', onPointerDown, true);
    onPointerDown = null;
  }
  if (onPointerMove) {
    document.removeEventListener('pointermove', onPointerMove, true);
    onPointerMove = null;
  }
  if (onPointerUp) {
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('pointercancel', onPointerUp, true);
    onPointerUp = null;
  }
  drag = null;
  pull = null;
  clearKeyboardRelease();
  releaseHeldKeyboard();
  clearHideTimer();
  document.documentElement.classList.remove(PROMPT_SCROLLING_CLASS);
}

/**
 * The mobile simulator turns a finger drag into a mouse drag and scrolls the
 * window. This page locks the window and scrolls the prompt, so follow that
 * drag on the prompt. While the keyboard is up, the drag must not steal focus
 * from the answer field or the simulator hides the keyboard.
 */
function startPromptDrag(event: PointerEvent): void {
  if (!isPromptPointer(event)) {
    return;
  }
  const section = findQuestionSection();
  if (!section || !dragStartsOnPrompt(event.target, section)) {
    return;
  }
  clearKeyboardRelease();
  rememberPull(event, section);
  if (retainAnswerKeyboard()) {
    keyboardHoldPointer = event.pointerId;
    if (event.pointerType === 'touch') {
      event.preventDefault();
    }
  }
  if (event.pointerType === 'touch' && keyboardHoldPointer !== event.pointerId) {
    return;
  }
  if (section.scrollHeight <= section.clientHeight) {
    return;
  }
  drag = {
    pointerId: event.pointerId,
    startY: event.clientY,
    lastY: event.clientY,
    section,
    active: false,
  };
}

function movePromptDrag(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) {
    return;
  }
  if (event.buttons === 0) {
    drag = null;
    holdKeyboardThroughClick(event.pointerId);
    return;
  }
  if (!drag.active) {
    if (Math.abs(event.clientY - drag.startY) < DRAG_START_PX) {
      return;
    }
    drag.active = true;
    drag.lastY = drag.startY;
  }
  const delta = event.clientY - drag.lastY;
  drag.lastY = event.clientY;
  drag.section.scrollTop -= delta;
}

function endPromptDrag(event: PointerEvent): void {
  refreshIfPulled(event);
  if (drag?.pointerId === event.pointerId) {
    drag = null;
  }
  holdKeyboardThroughClick(event.pointerId);
}

/**
 * The root no longer scrolls, so the browser cannot refresh from an overscroll.
 * A touch that starts at the top of the prompt and pulls down reloads instead.
 * Mouse drags belong to the simulator and keep scrolling the prompt.
 */
function rememberPull(event: PointerEvent, section: HTMLElement): void {
  if (event.pointerType !== 'touch' || section.scrollTop > 0) {
    return;
  }
  pull = { pointerId: event.pointerId, startY: event.clientY, section };
}

function refreshIfPulled(event: PointerEvent): void {
  if (!pull || pull.pointerId !== event.pointerId) {
    return;
  }
  const { startY, section } = pull;
  pull = null;
  if (event.type === 'pointercancel' || section.scrollTop > 0) {
    return;
  }
  if (event.clientY - startY < PULL_REFRESH_PX) {
    return;
  }
  reviewPage.reload();
}

/**
 * pointerup is not the end of a tap. Firefox Android blurs the answer field
 * on the click that follows, and that hides the keyboard. The app only hides
 * it on the system back gesture, so the focus hold stays through that click
 * and then drops. A later blur is the back gesture and must stand.
 */
function holdKeyboardThroughClick(pointerId: number): void {
  if (keyboardHoldPointer !== pointerId) {
    return;
  }
  clearKeyboardRelease();
  const release = () => {
    finishKeyboardHold(pointerId);
  };
  releaseOnClick = release;
  document.addEventListener('click', release, false);
  releaseTimer = setTimeout(release, 0);
}

function finishKeyboardHold(pointerId: number): void {
  clearKeyboardRelease();
  releaseHeldKeyboard(pointerId);
}

function clearKeyboardRelease(): void {
  if (releaseTimer !== null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  if (releaseOnClick) {
    document.removeEventListener('click', releaseOnClick, false);
    releaseOnClick = null;
  }
}

function releaseHeldKeyboard(pointerId?: number): void {
  if (keyboardHoldPointer === null) {
    return;
  }
  if (pointerId !== undefined && keyboardHoldPointer !== pointerId) {
    return;
  }
  keyboardHoldPointer = null;
  releaseAnswerKeyboard();
}

function isPromptPointer(event: PointerEvent): boolean {
  return document.documentElement.classList.contains(MOBILE_WEB_CLASS)
    && event.button === 0;
}

function dragStartsOnPrompt(target: EventTarget | null, section: HTMLElement): boolean {
  if (!(target instanceof Node) || !section.contains(target)) {
    return false;
  }
  return !(target instanceof Element && target.closest('input, textarea, select, [role="slider"]'));
}

function showScrollbar(): void {
  document.documentElement.classList.add(PROMPT_SCROLLING_CLASS);
  clearHideTimer();
  hideTimer = setTimeout(() => {
    document.documentElement.classList.remove(PROMPT_SCROLLING_CLASS);
    hideTimer = null;
  }, SCROLLBAR_HOLD_MS);
}

function clearHideTimer(): void {
  if (hideTimer === null) {
    return;
  }
  clearTimeout(hideTimer);
  hideTimer = null;
}
