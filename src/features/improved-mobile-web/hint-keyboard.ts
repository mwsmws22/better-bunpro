import { findAnswerInput } from '../../bunpro/quiz-dom';
import { MOBILE_WEB_CLASS } from './mobile-gate';

const HINT_BUTTON = 'button[title="Toggle the hint level"]';

let onHintPointerDown: ((event: Event) => void) | null = null;
let onHintClick: ((event: Event) => void) | null = null;
let releaseFocusBlock: (() => void) | null = null;

/**
 * Blur the answer field so a phone keyboard closes. The Mobile simulator
 * extension does not watch blur. It hides its on-screen keyboard on the next
 * click whose target is not a text field, so send that click after the blur.
 */
export function dismissAnswerKeyboard(): void {
  findAnswerInput()?.blur();
  const frame = window.frameElement;
  if (frame) {
    frame.dispatchEvent(new CustomEvent('custom-blur'));
    return;
  }
  document.documentElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/**
 * The app closes the keyboard when Hint is tapped and leaves it closed while
 * the hints cycle. Bunpro focuses the answer field from the hint click, and
 * the simulator opens its keyboard as soon as that focus happens. Block the
 * focus before the click, then blur once the hint has advanced.
 */
export function startHintKeyboardDismiss(): void {
  if (onHintPointerDown) {
    return;
  }
  onHintPointerDown = (event: Event) => {
    if (!isMobileHint(event.target)) {
      return;
    }
    holdAnswerUnfocused();
  };
  onHintClick = (event: Event) => {
    if (!isMobileHint(event.target)) {
      return;
    }
    dismissAnswerKeyboard();
    releaseSoon();
  };
  document.addEventListener('pointerdown', onHintPointerDown, true);
  document.addEventListener('click', onHintClick);
}

export function stopHintKeyboardDismiss(): void {
  if (onHintPointerDown) {
    document.removeEventListener('pointerdown', onHintPointerDown, true);
    onHintPointerDown = null;
  }
  if (onHintClick) {
    document.removeEventListener('click', onHintClick);
    onHintClick = null;
  }
  releaseFocusBlock?.();
}

function isMobileHint(target: EventTarget | null): boolean {
  return document.documentElement.classList.contains(MOBILE_WEB_CLASS)
    && target instanceof Element
    && target.closest(HINT_BUTTON) !== null;
}

/** Bunpro calls `input.focus()` from the hint click. Ignore that call. */
function holdAnswerUnfocused(): void {
  const input = findAnswerInput();
  if (!input) {
    return;
  }
  input.blur();
  if (releaseFocusBlock) {
    return;
  }
  Object.defineProperty(input, 'focus', {
    configurable: true,
    value: () => {},
  });
  releaseFocusBlock = () => {
    delete (input as { focus?: unknown }).focus;
    releaseFocusBlock = null;
  };
}

function releaseSoon(): void {
  setTimeout(() => releaseFocusBlock?.(), 0);
}
