import { injectStyles } from '../../styles';
import type { Feature } from '../registry';
import { startHintKeyboardHold, stopHintKeyboardHold } from './hint-keyboard';
import { startMobileGate, stopMobileGate } from './mobile-gate';
import { startPromptScroll, stopPromptScroll } from './prompt-scroll';
import { startVisualViewportSync, stopVisualViewportSync } from './visual-viewport';

/**
 * Fills the Bunpro review shell to the visible viewport on mobile so the soft
 * keyboard does not leave a permanent empty gap. Later mobile tweaks hang off
 * the same `html.bb-mobile-web` marker.
 */
export const improvedMobileWebFeature: Feature = {
  id: 'improved-mobile-web',
  title: 'Improved web mobile experience',
  description:
    'On phones (and narrow / responsive-design viewports), keeps the review UI ' +
    'filling the visible screen — answer bar at the bottom, no leftover gap when ' +
    'the keyboard closes. Desktop layouts are unchanged. More mobile polish may ' +
    'land under this setting later.',
  enabledByDefault: true,

  start() {
    injectStyles();
    startMobileGate((active) => {
      if (active) {
        startVisualViewportSync();
      } else {
        stopVisualViewportSync();
      }
    });
    startHintKeyboardHold();
    startPromptScroll();
  },

  stop() {
    stopHintKeyboardHold();
    stopPromptScroll();
    stopMobileGate();
    stopVisualViewportSync();
  },
};
