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
  title: 'Improved web mobile experience (beta)',
  description:
    'Beta — still rough; leave off unless you want to try it. On phones (and ' +
    'narrow / responsive-design viewports), keeps the review UI filling the ' +
    'visible screen — answer bar at the bottom, no leftover gap when the ' +
    'keyboard closes. Desktop layouts are unchanged.',
  enabledByDefault: false,

  start() {
    injectStyles();
    startHintKeyboardHold();
    startPromptScroll();
    startMobileGate((active) => {
      if (active) {
        startVisualViewportSync();
      } else {
        stopVisualViewportSync();
      }
    });
  },

  stop() {
    stopHintKeyboardHold();
    stopPromptScroll();
    stopMobileGate();
    stopVisualViewportSync();
  },
};
