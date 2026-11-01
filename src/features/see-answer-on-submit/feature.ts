import { findSeeAnswerButton, findSubmitButton } from '../../bunpro/quiz-dom';
import { areKeystrokesClaimed, hasModifier } from '../../ui/keystrokes';
import type { Feature } from '../registry';

const SUBMIT_KEY = 'Enter';

/**
 * After a wrong cloze answer Bunpro paints the field red and offers See Answer,
 * but Enter / the submit arrow skip straight to the next review. Blank give-up
 * already reveals on the second Enter; this makes a typed miss do the same.
 */
export const seeAnswerOnSubmitFeature: Feature = {
  id: 'see-answer-on-submit',
  title: 'Show the answer before moving on after a miss',
  description:
    'After a wrong cloze answer, Bunpro leaves you on red with See Answer. ' +
    '`Enter` or the submit arrow would skip to the next review. With this on, ' +
    'they reveal the answer first — the same idea as blank → warn → `Enter`.',
  enabledByDefault: true,

  start() {
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('click', onClick, true);
  },

  stop() {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('click', onClick, true);
  },
};

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== SUBMIT_KEY || event.repeat || hasModifier(event) || areKeystrokesClaimed()) {
    return;
  }
  revealInsteadOfAdvance(event);
}

function onClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Node) || findSubmitButton()?.contains(target) !== true) {
    return;
  }
  revealInsteadOfAdvance(event);
}

function revealInsteadOfAdvance(event: Event): void {
  const seeAnswer = findSeeAnswerButton();
  if (!seeAnswer) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  seeAnswer.click();
}
