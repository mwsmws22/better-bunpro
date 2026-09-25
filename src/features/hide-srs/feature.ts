import { injectStyles } from '../../styles';
import type { Feature } from '../registry';

/** Toggled on `<html>` so CSS can fully hide Bunpro’s SRS chip. */
export const HIDE_SRS_CLASS = 'bb-hide-srs';

/**
 * Bunpro’s “Review SRS → Hide” only conceals the level before you answer; after
 * a wrong / give-up / correct it flashes again (e.g. “Seasoned 2”). This keeps
 * that chip gone for the whole review.
 */
export const hideSrsFeature: Feature = {
  id: 'hide-srs',
  title: 'Fully hide review SRS',
  description:
    'Keeps Bunpro’s SRS level chip (Beginner / Seasoned / …) hidden for the whole ' +
    'review — including after a wrong answer, give-up, or correct. Pair with ' +
    'Bunpro’s Review SRS → Hide in review settings; that setting alone still ' +
    'reveals the level once you submit.',
  enabledByDefault: true,

  start() {
    injectStyles();
    document.documentElement.classList.add(HIDE_SRS_CLASS);
  },

  stop() {
    document.documentElement.classList.remove(HIDE_SRS_CLASS);
  },
};
