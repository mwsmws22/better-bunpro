import { KEYBOARD_COVER_GAP_PX } from './hint-keyboard';

/**
 * In Firefox's fullscreen installed app the page runs under the Android
 * navigation bar, yet Firefox shrinks visualViewport by the keyboard height
 * less that bar, so the bottom strip of the viewport sits behind the keyboard.
 * The gesture bar is 24dp, about one CSS px each in Firefox. While the status
 * bar shows, Firefox shrinks by the whole keyboard.
 */
export const GESTURE_NAV_BAR_PX = 24;

let uncoveredHeight = 0;

/** How much of the bottom of the visual viewport the keyboard covers. */
export function viewportBehindKeyboard(vv: VisualViewport): number {
  if (!keyboardCoversScreen(vv.height)) {
    uncoveredHeight = vv.height;
    return 0;
  }
  return pageUnderNavigationBar() ? GESTURE_NAV_BAR_PX : 0;
}

export function forgetUncoveredViewport(): void {
  uncoveredHeight = 0;
}

function keyboardCoversScreen(height: number): boolean {
  return window.screen.height - height > KEYBOARD_COVER_GAP_PX;
}

function pageUnderNavigationBar(): boolean {
  return isFullscreenApp() && uncoveredHeight >= window.screen.height - 1;
}

function isFullscreenApp(): boolean {
  return window.matchMedia?.('(display-mode: fullscreen)').matches ?? false;
}
