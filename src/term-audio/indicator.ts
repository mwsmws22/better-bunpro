import {
  findAnswerBarAudioControl,
  findDetailsPitchPlay,
  findExamplesListPlayControls,
  findOnScreenSentencePlayControls,
  studyQuestionIdOfPlayControl,
} from '../bunpro/quiz-dom';
import { findAnswerBarReplayControl } from './answer-replay';
import type { AudioOrigin } from './origin';
import { isRealAudioOrigin, labelForOrigin } from './origin';

const PLAY_TITLE_BACKUP = 'bbAudioTitle';
const REAL_AUDIO_CLASS = 'bb-audio-real';
const TTS_AUDIO_CLASS = 'bb-audio-tts';
const DEFAULT_PLAY_TITLE = 'Open the audio player and play audio';
/** Leftover from the short-lived inline chip; strip it if HMR left one behind. */
const LEGACY_CHIP_ID = 'bb-audio-source';

export interface AudioSourceCue {
  /** Accent real recordings only after the answer is in (or always on Details pages). */
  afterSubmit: boolean;
  /** Quiz answer-bar play control. */
  answerOrigin?: AudioOrigin | null;
  /** Details pitch-accent play control — often a different origin when the example has audio. */
  detailsOrigin?: AudioOrigin | null;
  /**
   * Info Examples list speakers, keyed by study-question id.
   * Does not include the quiz on-screen sentence card.
   */
  exampleOrigins?: ReadonlyMap<number, AudioOrigin> | null;
  /** File each Examples speaker would play, keyed like `exampleOrigins`. */
  exampleUrls?: ReadonlyMap<number, string> | null;
  /** File the answer-bar control would play. */
  answerUrl?: string | null;
  /** File the Details pitch control would play. */
  detailsUrl?: string | null;
  /** File the on-screen sentence speakers would play. Omit when they are not sentence audio. */
  sentenceUrl?: string | null;
  /** Tooltip names the source. Defaults on. */
  annotate?: boolean;
  /** Blue for a real recording, white for TTS. Defaults on. */
  color?: boolean;
  /**
   * Details plays its stamped file on click. Set when the global TTS rewrite
   * is off so a sentence card cannot be swapped onto the term recording.
   */
  ownDetails?: boolean;
}

interface CuePaint {
  annotate: boolean;
  color: boolean;
}

/**
 * Play-button tooltips for the audio source. Answer bar and Details can disagree:
 * when the on-screen example already has a clip, the answer bar stays on Bunpro
 * TTS while Details still shows a real term recording.
 */
export function syncAudioSourceIndicator(cue: AudioSourceCue): void {
  removeLegacyChip();
  const paint = { annotate: cue.annotate !== false, color: cue.color !== false };
  // Prefer our visible toggle — Bunpro’s play is CSS-hidden when we own the bar.
  const answer = findAnswerBarReplayControl() ?? findAnswerBarAudioControl();
  if (answer && cue.answerOrigin) {
    paintControl(answer, cue.answerOrigin, cue.afterSubmit, paint, cue.answerUrl);
  }
  const details = findDetailsPitchPlay();
  if (details && cue.detailsOrigin) {
    paintControl(details, cue.detailsOrigin, cue.afterSubmit, paint, cue.detailsUrl);
    if (cue.ownDetails) {
      details.dataset.bbOwnPlay = 'true';
    } else {
      delete details.dataset.bbOwnPlay;
    }
  }
  paintExampleControls(cue.exampleOrigins ?? null, cue.exampleUrls ?? null, cue.afterSubmit, paint);
  stampSentenceControls(cue.sentenceUrl ?? null);
}

export function clearAudioSourceIndicator(): void {
  restorePlayTitles();
  clearAudioClasses();
  removeLegacyChip();
}

function paintExampleControls(
  origins: ReadonlyMap<number, AudioOrigin> | null,
  urls: ReadonlyMap<number, string> | null,
  afterSubmit: boolean,
  paint: CuePaint,
): void {
  if (!afterSubmit) {
    return;
  }
  if (origins && origins.size > 0) {
    for (const control of findExamplesListPlayControls()) {
      const id = studyQuestionIdOfPlayControl(control);
      if (id === null) {
        continue;
      }
      const origin = origins.get(id);
      if (origin) {
        paintControl(control, origin, afterSubmit, paint, urls?.get(id) ?? null);
      }
    }
    return;
  }
  // Origins still loading — Bunpro’s default is accent blue; force TTS white now
  // so speakers do not flash blue→white when the lookup finishes.
  paintExampleControlsPendingTts(paint);
}

/** White TTS cue only; leave title as Bunpro’s until the engine is known. */
function paintExampleControlsPendingTts(paint: CuePaint): void {
  if (!paint.color) {
    return;
  }
  for (const control of findExamplesListPlayControls()) {
    rememberPlayTitle(control);
    control.classList.add(TTS_AUDIO_CLASS);
    control.classList.remove(REAL_AUDIO_CLASS);
  }
}

function stampSentenceControls(url: string | null): void {
  if (!url) {
    return;
  }
  for (const control of findOnScreenSentencePlayControls()) {
    control.dataset.bbResolvedUrl = url;
  }
}

function paintControl(
  control: HTMLElement,
  origin: AudioOrigin,
  afterSubmit: boolean,
  paint: CuePaint,
  url: string | null | undefined,
): void {
  if (url) {
    control.dataset.bbResolvedUrl = url;
  }
  const label = labelForOrigin(origin);
  const emphasize = paint.color && afterSubmit && isRealAudioOrigin(origin);
  const asTts = paint.color && afterSubmit && !isRealAudioOrigin(origin);
  const title = paint.annotate ? label : (control.dataset[PLAY_TITLE_BACKUP] ?? control.title);
  if (
    control.title === title &&
    control.classList.contains(REAL_AUDIO_CLASS) === emphasize &&
    control.classList.contains(TTS_AUDIO_CLASS) === asTts &&
    (!url || control.dataset.bbResolvedUrl === url)
  ) {
    return;
  }

  rememberPlayTitle(control);
  const nextTitle = paint.annotate ? label : (control.dataset[PLAY_TITLE_BACKUP] ?? control.title);
  if (control.title !== nextTitle) {
    control.title = nextTitle;
  }
  control.classList.toggle(REAL_AUDIO_CLASS, emphasize);
  control.classList.toggle(TTS_AUDIO_CLASS, asTts);
}

function rememberPlayTitle(control: HTMLElement): void {
  if (control.dataset[PLAY_TITLE_BACKUP] === undefined) {
    control.dataset[PLAY_TITLE_BACKUP] = control.title || DEFAULT_PLAY_TITLE;
  }
}

function paintedControls(): HTMLElement[] {
  const controls = [
    findAnswerBarReplayControl() ?? findAnswerBarAudioControl(),
    findDetailsPitchPlay(),
  ].filter((el): el is HTMLElement => el !== null);
  controls.push(...findExamplesListPlayControls());
  return controls;
}

function restorePlayTitles(): void {
  for (const control of paintedControls()) {
    const original = control.dataset[PLAY_TITLE_BACKUP];
    if (original !== undefined) {
      control.title = original;
      delete control.dataset[PLAY_TITLE_BACKUP];
    }
  }
}

function clearAudioClasses(): void {
  for (const control of paintedControls()) {
    control.classList.remove(REAL_AUDIO_CLASS, TTS_AUDIO_CLASS);
    delete control.dataset.bbResolvedUrl;
    delete control.dataset.bbOwnPlay;
  }
  for (const control of findOnScreenSentencePlayControls()) {
    delete control.dataset.bbResolvedUrl;
  }
}

function removeLegacyChip(): void {
  document.getElementById(LEGACY_CHIP_ID)?.remove();
}
