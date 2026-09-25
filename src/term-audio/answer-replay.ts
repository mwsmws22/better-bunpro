import { findAnswerConsole } from '../bunpro/quiz-dom';
import { element, svgIcon } from '../dom';
import { injectStyles } from '../styles';
import { areKeystrokesClaimed, hasModifier } from '../ui/keystrokes';
import { prefetchAudioHref } from './prefetch-audio';
import { canonicalAudioUrl, replacementFor } from './store';

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
let currentAudio: HTMLMediaElement | null = null;
/** True when {@link currentAudio} is a detached element we created (safe to clear src). */
let currentAudioDetached = false;
let mediaListeners: { media: HTMLMediaElement; stop: () => void } | null = null;

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

/**
 * Start (or restart) the clip and show pause — used by fallback autoplay and
 * by click/`P` when Bunpro never handed us a media element.
 * Mounts the toggle if paint has not synced yet so autoplay still flips
 * play→pause instead of playing with a missing / static control.
 */
export function playAnswerBarRecording(url: string): void {
  playUrl = url;
  injectStyles();
  ensureReplayButton(url);
  ensurePHotkey();
  ensureBunproClickIntercept();
  startPlayback(url);
}

/**
 * Answer-bar clip is ours: mount the play↔pause toggle on Bunpro’s media
 * element. Caller must still invoke native `play()` on that element so the
 * correct-answer autoplay gesture is preserved (a detached `Audio.play()` is
 * often blocked, which left the toggle stuck on play).
 *
 * Bunpro autoplays in the same tick as post-attempt — often before paint has
 * synced `playUrl`. Fall back to the prefetch link in that case.
 */
export function takeOverBunproAnswerPlay(
  media: HTMLMediaElement,
  src: string,
  replacement: string | null,
): boolean {
  const owned = ownedAnswerBarUrl(src, replacement);
  if (!owned) {
    return false;
  }
  playUrl = owned;
  injectStyles();
  ensureReplayButton(owned);
  ensurePHotkey();
  ensureBunproClickIntercept();
  // Prefer the recording we own (JPod blob) when Bunpro still points at TTS.
  if (canonicalAudioUrl(media.src || src) !== canonicalAudioUrl(owned)) {
    media.src = owned;
  }
  adoptMediaElement(media);
  setPlaying(true);
  return true;
}

/** Clip we should play on the answer-bar toggle, if this `play()` is ours. */
function ownedAnswerBarUrl(src: string, replacement: string | null): string | null {
  if (playUrl && urlMatchesOwned(src, replacement, playUrl)) {
    return playUrl;
  }
  const prefetch = prefetchAudioHref();
  const recording = prefetch ? replacementFor(prefetch) : null;
  // Src may already be the JPod blob (our `src` setter swapped it) before paint
  // synced playUrl — still treat that as the answer-bar clip.
  if (recording && urlMatchesOwned(src, replacement, recording)) {
    return playUrl ?? recording;
  }
  if (prefetch && urlMatchesOwned(src, replacement, prefetch)) {
    return playUrl ?? recording ?? prefetch;
  }
  return null;
}

function urlMatchesOwned(
  src: string,
  replacement: string | null,
  owned: string,
): boolean {
  const want = canonicalAudioUrl(owned);
  return (
    canonicalAudioUrl(src) === want ||
    (replacement !== null && canonicalAudioUrl(replacement) === want) ||
    canonicalAudioUrl(replacement ?? src) === want
  );
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
    // Remount/paint can re-sync while audio is already running — keep pause.
    if (currentAudio && !currentAudio.paused) {
      existing.classList.add(PLAYING_CLASS);
    }
    return;
  }

  const answerConsole = findAnswerConsole();
  if (!answerConsole) {
    return;
  }

  // Bunpro’s play is a direct `.InputManual` flex sibling beside an empty `p-6`
  // spacer. Putting our toggle *inside* that spacer made it 48×48 and grew the
  // green answer bar vs Bunpro’s 36×36 play control.
  const stray = answerConsole.querySelector(`#${ANSWER_BAR_REPLAY_ID}`);
  stray?.remove();
  for (const spacer of answerConsole.querySelectorAll(':scope > div.p-6')) {
    spacer.replaceChildren();
  }

  const button = buildReplayButton(url);
  if (currentAudio && !currentAudio.paused) {
    button.classList.add(PLAYING_CLASS);
  }

  const form = answerConsole.querySelector(':scope > form, :scope > .InputManual__form');
  const spacer = answerConsole.querySelector(':scope > div.p-6');
  if (spacer) {
    answerConsole.insertBefore(button, spacer);
  } else if (form) {
    answerConsole.insertBefore(button, form);
  } else {
    answerConsole.prepend(button);
  }
}

function buildReplayButton(url: string): HTMLButtonElement {
  const playIcon = sizedPlaySvg('bb-replay-play', PLAY_CIRCLE_PATH);
  const pauseIcon = sizedPlaySvg('bb-replay-pause', PAUSE_PATH);
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
      // Match Bunpro’s answer-bar play classes (no `block` — that changed flex sizing).
      class: 'transition-opacity',
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

/** Same em-sized SVG Bunpro uses inside the 2.25rem play control. */
function sizedPlaySvg(className: string, path: string): SVGSVGElement {
  const icon = svgIcon(`h-24 w-24 ${className}`, `<path d="${path}" fill="currentColor"/>`);
  icon.setAttribute('style', 'width: 0.666667em; height: 0.666667em;');
  return icon;
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

function adoptMediaElement(media: HTMLMediaElement): void {
  detachCurrentMedia({ pause: false, clearSrc: false });
  currentAudio = media;
  currentAudioDetached = false;
  listenToMedia(media);
}

function startPlayback(url: string): void {
  stopPlayback();
  const audio = new Audio(url);
  currentAudio = audio;
  currentAudioDetached = true;
  listenToMedia(audio);
  setPlaying(true);
  void audio.play().catch(() => {
    if (currentAudio === audio) {
      setPlaying(false);
      currentAudio = null;
      currentAudioDetached = false;
    }
  });
}

function listenToMedia(media: HTMLMediaElement): void {
  mediaListeners?.stop();
  const onEnded = () => {
    if (currentAudio === media) {
      currentAudio = null;
      currentAudioDetached = false;
      setPlaying(false);
    }
  };
  const onPause = () => {
    if (currentAudio === media && media.paused) {
      setPlaying(false);
    }
  };
  const onPlay = () => {
    if (currentAudio === media) {
      setPlaying(true);
    }
  };
  media.addEventListener('ended', onEnded);
  media.addEventListener('pause', onPause);
  media.addEventListener('play', onPlay);
  mediaListeners = {
    media,
    stop: () => {
      media.removeEventListener('ended', onEnded);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('play', onPlay);
    },
  };
}

function stopPlayback(): void {
  detachCurrentMedia({ pause: true, clearSrc: true });
  setPlaying(false);
}

function detachCurrentMedia(options: { pause: boolean; clearSrc: boolean }): void {
  mediaListeners?.stop();
  mediaListeners = null;
  const audio = currentAudio;
  currentAudio = null;
  const detached = currentAudioDetached;
  currentAudioDetached = false;
  if (!audio) {
    return;
  }
  if (options.pause) {
    audio.pause();
  }
  if (options.clearSrc && detached) {
    audio.src = '';
  }
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
