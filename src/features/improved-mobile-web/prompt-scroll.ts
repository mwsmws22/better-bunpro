import { findQuestionSection } from '../../bunpro/quiz-dom';
import { releaseAnswerKeyboard, retainAnswerKeyboard } from './hint-keyboard';
import { MOBILE_WEB_CLASS } from './mobile-gate';
import { beginPull, cancelPull, finishPull, followPull } from './pull-refresh';

/** On `<html>` while the prompt section is scrolling, so its scrollbar can show. */
export const PROMPT_SCROLLING_CLASS = 'bb-prompt-scrolling';

const SCROLLBAR_HOLD_MS = 700;
/** Ignore a tap that only jitters. The simulator uses the same threshold. */
const DRAG_START_PX = 5;

let onScroll: ((event: Event) => void) | null = null;
let onPointerDown: ((event: PointerEvent) => void) | null = null;
let onPointerMove: ((event: PointerEvent) => void) | null = null;
let onPointerUp: ((event: PointerEvent) => void) | null = null;
let onTouchStart: ((event: TouchEvent) => void) | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let drag: PromptDrag | null = null;
let keyboardHoldPointer: number | null = null;

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
  onTouchStart = startPromptPull;
  document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
  document.addEventListener('touchmove', followPull, { capture: true, passive: true });
  document.addEventListener('touchend', finishPull, { capture: true, passive: true });
  document.addEventListener('touchcancel', finishPull, { capture: true, passive: true });
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
  if (onTouchStart) {
    document.removeEventListener('touchstart', onTouchStart, true);
    document.removeEventListener('touchmove', followPull, true);
    document.removeEventListener('touchend', finishPull, true);
    document.removeEventListener('touchcancel', finishPull, true);
    onTouchStart = null;
  }
  cancelPull();
  drag = null;
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
  if (!section || !startsOnPrompt(event.target, [section])) {
    return;
  }
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
    releaseHeldKeyboard(event.pointerId);
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
  if (drag?.pointerId === event.pointerId) {
    drag = null;
  }
  releaseHeldKeyboard(event.pointerId);
}

/** A pull from the prompt or the header above it, as from the top of a page. */
function startPromptPull(event: TouchEvent): void {
  const section = findQuestionSection();
  const touch = event.touches.length === 1 ? event.touches[0] : undefined;
  if (!isMobileWeb() || !section || !touch) {
    cancelPull();
    return;
  }
  const header = section.parentElement?.querySelector<HTMLElement>(':scope > header');
  if (!startsOnPrompt(event.target, header ? [section, header] : [section])) {
    cancelPull();
    return;
  }
  beginPull(touch, section);
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
  return isMobileWeb() && event.button === 0;
}

function isMobileWeb(): boolean {
  return document.documentElement.classList.contains(MOBILE_WEB_CLASS);
}

function startsOnPrompt(target: EventTarget | null, areas: HTMLElement[]): boolean {
  if (!(target instanceof Node) || !areas.some((area) => area.contains(target))) {
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
