import { findAnswerConsole } from '../bunpro/quiz-dom';
import { element, svgIcon } from '../dom';
import { injectStyles } from '../styles';
import { areKeystrokesClaimed, hasModifier } from '../ui/keystrokes';

/**
 * Answer-bar audio is always our play↔pause toggle after submit. Bunpro’s own
 * player chrome (X / timer / open-player bar) is hidden in CSS; we play through
 * a detached `Audio` so that UI never opens.
 *
 * ## Remount safety (READ BEFORE CHANGING)
 *
 * Injecting into `.InputManual` fires `watchBodyRemounts`. That path must only
 * re-paint, not re-load term audio. Idempotent: never `replaceChildren` when the
 * button already exists; play↔pause is a class toggle only.
 */

export const ANSWER_BAR_REPLAY_ID = 'bb-answer-bar-replay';
const PLAYING_CLASS = 'bb-replay-playing';

const PLAY_CIRCLE_PATH =
  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 13.5v-7a.5.5 0 0 1 ' +
  '.8-.4l4.67 3.5c.27.2.27.6 0 .8l-4.67 3.5a.5.5 0 0 1-.8-.4';

const PAUSE_PATH = 'M6 19h4V5H6zm8-14v14h4V5z';

let playUrl: string | null = null;
let listeningForP = false;
let interceptingClicks = false;
let currentAudio: HTMLAudioElement | null = null;

export interface AnswerBarReplayOptions {
  enabled: boolean;
  playUrl: string | null;
}

export function syncAnswerBarReplay(options: AnswerBarReplayOptions): void {
  if (!options.enabled) {
    clearAnswerBarReplay();
    return;
  }
  if (!options.playUrl) {
    return;
  }
  // Keep hide-Bunpro-play rules fresh (injectStyles used to no-op after first run).
  injectStyles();
  playUrl = options.playUrl;
  ensureReplayButton(options.playUrl);
  ensurePHotkey();
  ensureBunproClickIntercept();
}

/** Start (or restart) the clip and show pause — used by fallback autoplay. */
export function playAnswerBarRecording(url: string): void {
  playUrl = url;
  const button = findAnswerBarReplayControl();
  if (button instanceof HTMLButtonElement) {
    button.dataset.bbPlayUrl = url;
  }
  startPlayback(url);
}

/**
 * If our toggle owns this clip, start it there and signal the caller to skip
 * Bunpro’s native `play()` (which opens the X/timer bar).
 */
export function takeOverBunproAnswerPlay(
  src: string,
  replacement: string | null,
): boolean {
  if (!playUrl || !findAnswerBarReplayControl()) {
    return false;
  }
  const url = replacement ?? src;
  if (url !== playUrl && replacement !== playUrl && src !== playUrl) {
    return false;
  }
  playAnswerBarRecording(playUrl);
  return true;
}

export function clearAnswerBarReplay(): void {
  stopPlayback();
  playUrl = null;
  document.getElementById(ANSWER_BAR_REPLAY_ID)?.remove();
  stopPHotkey();
  stopBunproClickIntercept();
}

export function findAnswerBarReplayControl(): HTMLElement | null {
  const button = document.getElementById(ANSWER_BAR_REPLAY_ID);
  return button instanceof HTMLElement ? button : null;
}

/** True when this media element is our toggle player (not Bunpro’s). */
export function isAnswerBarReplayAudio(media: HTMLMediaElement): boolean {
  return currentAudio !== null && media === currentAudio;
}

function ensureReplayButton(url: string): void {
  const existing = findAnswerBarReplayControl();
  if (existing instanceof HTMLButtonElement) {
    existing.dataset.bbPlayUrl = url;
    return;
  }

  const slot = findOrCreateReplaySlot();
  if (!slot) {
    return;
  }

  slot.replaceChildren(buildReplayButton(url));
}

function findOrCreateReplaySlot(): HTMLElement | null {
  const answerConsole = findAnswerConsole();
  if (!answerConsole) {
    return null;
  }

  const spacer = answerConsole.querySelector<HTMLElement>(':scope > div.p-6');
  if (spacer) {
    return spacer;
  }

  const form = answerConsole.querySelector(':scope > form, :scope > .InputManual__form');
  const wrap = element('div', { class: 'p-6' });
  if (form) {
    answerConsole.insertBefore(wrap, form);
  } else {
    answerConsole.prepend(wrap);
  }
  return wrap;
}

function buildReplayButton(url: string): HTMLButtonElement {
  const playIcon = svgIcon(
    'h-24 w-24 bb-replay-play',
    `<path d="${PLAY_CIRCLE_PATH}" fill="currentColor"/>`,
  );
  const pauseIcon = svgIcon(
    'h-24 w-24 bb-replay-pause',
    `<path d="${PAUSE_PATH}" fill="currentColor"/>`,
  );
  const sizing = element(
    'div',
    { class: 'bp-hover-bg__child rounded-normal', style: 'font-size: 2.25rem;' },
    [
      element(
        'div',
        {
          class: 'relative flex items-center justify-center',
          style: 'width: 1em; height: 1em;',
        },
        [playIcon, pauseIcon],
      ),
    ],
  );

  const button = element(
    'button',
    {
      id: ANSWER_BAR_REPLAY_ID,
      type: 'button',
      class: 'block transition-opacity',
      'data-bb-play-url': url,
    },
    [sizing],
  );
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    togglePlayback();
  });
  return button;
}

function togglePlayback(): void {
  if (!playUrl) {
    return;
  }
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    setPlaying(false);
    return;
  }
  startPlayback(playUrl);
}

function startPlayback(url: string): void {
  stopPlayback();
  const audio = new Audio(url);
  currentAudio = audio;
  audio.addEventListener('ended', () => {
    if (currentAudio === audio) {
      currentAudio = null;
      setPlaying(false);
    }
  });
  audio.addEventListener('pause', () => {
    if (currentAudio === audio && audio.paused) {
      setPlaying(false);
    }
  });
  audio.addEventListener('play', () => {
    if (currentAudio === audio) {
      setPlaying(true);
    }
  });
  setPlaying(true);
  void audio.play().catch(() => {
    setPlaying(false);
    currentAudio = null;
  });
}

function stopPlayback(): void {
  if (!currentAudio) {
    setPlaying(false);
    return;
  }
  const audio = currentAudio;
  currentAudio = null;
  audio.pause();
  audio.src = '';
  setPlaying(false);
}

function setPlaying(playing: boolean): void {
  findAnswerBarReplayControl()?.classList.toggle(PLAYING_CLASS, playing);
}

function ensurePHotkey(): void {
  if (listeningForP) {
    return;
  }
  window.addEventListener('keydown', onReplayKeyDown, true);
  listeningForP = true;
}

function stopPHotkey(): void {
  if (!listeningForP) {
    return;
  }
  window.removeEventListener('keydown', onReplayKeyDown, true);
  listeningForP = false;
}

function onReplayKeyDown(event: KeyboardEvent): void {
  if (areKeystrokesClaimed() || hasModifier(event)) {
    return;
  }
  if (event.key !== 'p' && event.key !== 'P') {
    return;
  }
  if (!playUrl || !findAnswerBarReplayControl()) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  togglePlayback();
}

/**
 * Steal Bunpro’s answer-bar play / pause / close clicks so their player bar
 * never opens; we toggle our own control instead.
 */
function ensureBunproClickIntercept(): void {
  if (interceptingClicks) {
    return;
  }
  document.addEventListener('click', onBunproAudioClick, true);
  interceptingClicks = true;
}

function stopBunproClickIntercept(): void {
  if (!interceptingClicks) {
    return;
  }
  document.removeEventListener('click', onBunproAudioClick, true);
  interceptingClicks = false;
}

function onBunproAudioClick(event: MouseEvent): void {
  if (!playUrl || !findAnswerBarReplayControl()) {
    return;
  }
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const button = target.closest('.InputManual > button');
  if (!(button instanceof HTMLElement) || button.id === ANSWER_BAR_REPLAY_ID) {
    return;
  }
  const icon = button.querySelector('svg')?.getAttribute('data-name');
  if (icon !== 'PLAY_CIRCLE_FILLED' && icon !== 'PAUSE' && icon !== 'CANCEL') {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (icon === 'CANCEL') {
    stopPlayback();
    return;
  }
  togglePlayback();
}
