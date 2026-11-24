import { fetchStudyQuestions } from '../../bunpro/api';
import { readQuizState, watchQuizState, type QuizState } from '../../bunpro/quiz-state';
import { reviewKey } from '../../bunpro/review';
import { watchBodyRemounts } from '../../dom/remount';
import { injectStyles } from '../../styles';
import {
  cancelScheduledTermAutoplay,
  resetTermAutoplayState,
  scheduleTermRecordingAutoplay,
  setActiveTermAutoplayReview,
  setTermAutoplayPlayer,
  setTermAutoplaySkipWhen,
} from '../../term-audio/autoplay';
import {
  clearAnswerBarReplay,
  playAnswerBarRecording,
  syncAnswerBarReplay,
} from '../../term-audio/answer-replay';
import {
  answerBarPrefetchHref,
  exampleClipsFromSentences,
  exampleOnScreenHasAudio,
  type ExampleClip,
} from '../../term-audio/example-audio';
import { warnIfGmBridgeMissing } from '../../term-audio/cross-origin';
import { startDetailsPlay, stopDetailsPlay } from '../../term-audio/details-play';
import { startAudioDownloads, stopAudioDownloads } from '../../term-audio/download';
import { grammarSlugFromPath, reviewableFromGrammarSlug } from '../../term-audio/grammar-page';
import { clearAudioSourceIndicator, syncAudioSourceIndicator } from '../../term-audio/indicator';
import { loadTermAudio, type TermAudioOrigins } from '../../term-audio/load';
import type { AudioOrigin } from '../../term-audio/origin';
import { bunproClipOrigin, isRealAudioOrigin } from '../../term-audio/origin';
import { readAudioMenu, realSpeakersOn } from '../../term-audio/options';
import { startReplacingAudio, stopReplacingAudio } from '../../term-audio/playback';
import { forgetReplacements } from '../../term-audio/replacements';
import { clearActiveReplacement, setActiveReplacement } from '../../term-audio/store';
import { onStoredChange } from '../../settings/store';
import { buildAudioMenu } from './menu';
import { reviewableFromVocabSlug, vocabSlugFromPath } from '../../term-audio/vocab-page';
import type { Feature } from '../registry';

let stopWatchingQuiz: (() => void) | null = null;
let stopWatchingRemounts: (() => void) | null = null;
let shownFor: string | null = null;
let shownAnswerOrigin: AudioOrigin | null = null;
let shownDetailsOrigin: AudioOrigin | null = null;
let shownExampleClips: Map<number, ExampleClip> | null = null;
/** Blob URL for answer-bar replay when Bunpro left the play slot empty. */
let shownAnswerPlayUrl: string | null = null;
/** Clip the Details pitch control should play for this card. */
let shownDetailsPlayUrl: string | null = null;
/** True once the term lookup has settled, so a null answer URL can drop a guessed clip. */
let answerSettled = false;
/** Details click plays the term recording because the global rewrite is off. */
let detailsClickOwned = false;
/** Details / grammar pages tint as soon as origins are ready — no answer step. */
let cueAfterReady = false;
let stopAudioSettings: (() => void) | null = null;

export const humanTermAudioFeature: Feature = {
  id: 'human-term-audio',
  title: 'Audio',
  description: '',
  submenu: buildAudioMenu,
  enabledByDefault: true,

  start() {
    injectStyles();
    warnIfGmBridgeMissing();
    readAudioMenu();
    syncAudioPresentation();
    startAudioDownloads();
    startDetailsPlay();
    setTermAutoplaySkipWhen(() => exampleOnScreenHasAudio());
    setTermAutoplayPlayer(playAnswerBarRecording);
    stopWatchingQuiz = watchQuizState(onQuizStateChange);
    stopAudioSettings = onStoredChange(onAudioSetting);
    stopWatchingRemounts = watchBodyRemounts(() => {
      const state = readQuizState();
      const review = state.reviewable ? reviewKey(state) : null;
      // Same card already resolved — only re-paint. Never re-load / re-inject on
      // our own DOM writes (answer-bar replay) or Bunpro’s play↔pause swaps.
      if (
        review !== null &&
        shownFor === review &&
        (shownAnswerOrigin !== null || shownDetailsOrigin !== null)
      ) {
        // Sentence audio became detectable after the first load (Play control
        // appeared). Flip the answer cue off JPod / onto the sentence engine
        // (classic / Gemini / ElevenLabs) without re-fetching.
        if (shownAnswerOrigin !== null && exampleOnScreenHasAudio()) {
          const clip = answerBarPrefetchHref();
          if (clip) {
            shownAnswerPlayUrl = clip;
            shownAnswerOrigin = bunproClipOrigin(clip) ?? 'bunpro-tts';
            cancelScheduledTermAutoplay();
          } else if (isRealAudioOrigin(shownAnswerOrigin)) {
            // Sentence is on screen but its file is not identified. Drop the
            // term recording instead of leaving that file on the answer bar.
            shownAnswerOrigin = 'bunpro-tts';
            shownAnswerPlayUrl = null;
            answerSettled = true;
            cancelScheduledTermAutoplay();
          }
        }
        paintCues();
        return;
      }
      if (state.reviewable && review !== null) {
        void refreshReview(state);
        return;
      }
      if (
        shownAnswerOrigin !== null ||
        shownDetailsOrigin !== null ||
        shownExampleClips !== null
      ) {
        paintCues();
      }
      void refreshItemPage();
    });
    // Quiz metadata never appears on a vocab/grammar page, and a quiet page
    // may not mutate after the script starts. Load that page explicitly.
    void refreshItemPage();
  },

  stop() {
    stopWatchingRemounts?.();
    stopWatchingRemounts = null;
    stopWatchingQuiz?.();
    stopWatchingQuiz = null;
    stopAudioSettings?.();
    stopAudioSettings = null;
    stopAudioDownloads();
    stopDetailsPlay();
    document.documentElement.classList.remove('bb-audio-color');
    stopReplacingAudio();
    clearActiveReplacement();
    forgetReplacements();
    clearAudioSourceIndicator();
    clearAnswerBarReplay();
    setTermAutoplaySkipWhen(null);
    setTermAutoplayPlayer(null);
    resetTermAutoplayState();
    shownFor = null;
    shownAnswerOrigin = null;
    shownDetailsOrigin = null;
    shownExampleClips = null;
    shownAnswerPlayUrl = null;
    shownDetailsPlayUrl = null;
    answerSettled = false;
    detailsClickOwned = false;
    cueAfterReady = false;
  },
};

function onQuizStateChange(state: QuizState): void {
  if (state.reviewable && reviewKey(state) !== null) {
    void refreshReview(state);
    return;
  }
  void refreshItemPage();
}

async function refreshReview(state: QuizState): Promise<void> {
  const term = state.reviewable;
  const review = reviewKey(state);
  if (!term || review === null) {
    return;
  }

  cueAfterReady = false;
  if (shownFor !== review) {
    shownFor = review;
    shownAnswerOrigin = null;
    shownDetailsOrigin = null;
    shownExampleClips = null;
    shownAnswerPlayUrl = null;
    shownDetailsPlayUrl = null;
    answerSettled = false;
    detailsClickOwned = false;
    clearActiveReplacement();
    clearAudioSourceIndicator();
    clearAnswerBarReplay();
    setActiveTermAutoplayReview(review);
  }

  void loadExampleOrigins(term, () => reviewKey(readQuizState()) === review);

  if (term.type !== 'vocab') {
    // Grammar (and other non-vocab): own Bunpro’s clip as play↔pause when present.
    adoptBunproAnswerClip(review);
    if (shownExampleClips !== null || shownAnswerPlayUrl !== null) {
      paintCues();
    }
    return;
  }

  await loadTermAudio(
    term,
    (origins) => {
      if (reviewKey(readQuizState()) !== review) {
        return;
      }
      shownFor = review;
      applyTermOrigins(origins, { keepSentenceOverTerm: true });
      paintCues();
      maybeAutoplayTermRecording(review, shownAnswerPlayUrl, shownAnswerOrigin!);
    },
    { useRealSpeakers: realSpeakersOn('reviews') },
  );

  if (reviewKey(readQuizState()) !== review) {
    return;
  }
  if (
    shownFor === review &&
    shownAnswerOrigin === null &&
    shownDetailsOrigin === null &&
    shownExampleClips === null
  ) {
    clearShown();
  } else if (
    shownAnswerOrigin !== null ||
    shownDetailsOrigin !== null ||
    shownExampleClips !== null
  ) {
    paintCues();
  }
}

/** Vocabulary / grammar detail pages: cue Examples (and vocab Details pitch) immediately. */
async function refreshItemPage(): Promise<void> {
  const vocabSlug = vocabSlugFromPath();
  if (vocabSlug) {
    await refreshVocabPage(vocabSlug);
    return;
  }
  const grammarSlug = grammarSlugFromPath();
  if (grammarSlug) {
    await refreshGrammarPage(grammarSlug);
    return;
  }
  clearShown();
}

async function refreshVocabPage(slug: string): Promise<void> {
  const key = `page:vocab:${slug}`;
  cueAfterReady = true;
  if (shownFor === key && shownDetailsOrigin !== null) {
    paintCues();
    return;
  }
  if (shownFor !== key) {
    shownFor = key;
    shownAnswerOrigin = null;
    shownDetailsOrigin = null;
    shownExampleClips = null;
    shownDetailsPlayUrl = null;
    answerSettled = false;
    detailsClickOwned = false;
    clearActiveReplacement();
    clearAudioSourceIndicator();
  } else if (shownDetailsOrigin === null) {
    return;
  }
  // Whiten Examples speakers before the study-question fetch returns.
  paintCues();

  const term = await reviewableFromVocabSlug(slug);
  if (!term || vocabSlugFromPath() !== slug) {
    return;
  }

  void loadExampleOrigins(term, () => vocabSlugFromPath() === slug);

  await loadTermAudio(
    term,
    (origins) => {
      if (vocabSlugFromPath() !== slug) {
        return;
      }
      shownFor = key;
      applyTermOrigins(origins, { keepSentenceOverTerm: false });
      paintCues();
    },
    { ignoreExampleAudio: true, useRealSpeakers: realSpeakersOn('vocab') },
  );

  if (vocabSlugFromPath() !== slug) {
    return;
  }
  if (shownFor === key && shownDetailsOrigin === null && shownExampleClips === null) {
    clearShown();
  } else if (shownDetailsOrigin !== null || shownExampleClips !== null) {
    paintCues();
  }
}

async function refreshGrammarPage(slug: string): Promise<void> {
  const key = `page:grammar:${slug}`;
  cueAfterReady = true;
  if (shownFor === key && shownExampleClips !== null) {
    paintCues();
    return;
  }
  if (shownFor !== key) {
    shownFor = key;
    shownAnswerOrigin = null;
    shownDetailsOrigin = null;
    shownExampleClips = null;
    shownAnswerPlayUrl = null;
    shownDetailsPlayUrl = null;
    answerSettled = false;
    detailsClickOwned = false;
    clearActiveReplacement();
    clearAudioSourceIndicator();
  } else if (shownExampleClips === null) {
    return;
  }
  paintCues();

  const term = await reviewableFromGrammarSlug(slug);
  if (!term || grammarSlugFromPath() !== slug) {
    return;
  }

  await loadExampleOrigins(term, () => grammarSlugFromPath() === slug);

  if (grammarSlugFromPath() !== slug) {
    return;
  }
  if (shownFor === key && shownExampleClips === null) {
    clearShown();
  }
}

async function loadExampleOrigins(
  term: NonNullable<QuizState['reviewable']>,
  stillCurrent: () => boolean,
): Promise<void> {
  try {
    const sentences = await fetchStudyQuestions(term);
    if (!stillCurrent()) {
      return;
    }
    shownExampleClips = exampleClipsFromSentences(sentences);
    paintCues();
  } catch {
    // Term-audio lookup already warns; Examples cues are best-effort.
  }
}

function applyTermOrigins(
  origins: TermAudioOrigins,
  options: { keepSentenceOverTerm: boolean },
): void {
  // The lookup paints twice. The first pass has no file yet — keep a clip we
  // already settled, or a later refresh would drop it and play nothing.
  if (!origins.lookupDone) {
    if (!answerSettled) {
      shownAnswerOrigin = origins.answer;
      shownDetailsOrigin = origins.details;
    }
    return;
  }

  const keepBunproAnswer =
    options.keepSentenceOverTerm &&
    shownAnswerOrigin !== null &&
    !isRealAudioOrigin(shownAnswerOrigin) &&
    isRealAudioOrigin(origins.answer) &&
    exampleOnScreenHasAudio();

  if (keepBunproAnswer) {
    const clip = answerBarPrefetchHref();
    shownAnswerPlayUrl = clip;
    if (clip) {
      shownAnswerOrigin = bunproClipOrigin(clip) ?? shownAnswerOrigin;
    }
  } else {
    shownAnswerOrigin = origins.answer;
    shownAnswerPlayUrl = origins.answerPlayUrl;
  }
  shownDetailsOrigin = origins.details;
  shownDetailsPlayUrl = origins.detailsPlayUrl;
  if (!origins.lookupDone) {
    return;
  }
  answerSettled = true;
  detailsClickOwned = Boolean(origins.recordingUrl) && origins.rewriteFrom.length === 0;
  if (origins.recordingUrl && origins.rewriteFrom.length > 0) {
    setActiveReplacement(origins.rewriteFrom, origins.recordingUrl, origins.details);
    return;
  }
  clearActiveReplacement();
}

function paintCues(): void {
  const menu = readAudioMenu();
  const afterSubmit = cueAfterReady || readQuizState().isPostAttempt;
  // Own the answer bar after submit whenever we may have a clip — including when
  // Bunpro autoplay already mounted the toggle via takeOver before load finished.
  // A null playUrl must not clear while the lookup is still running.
  syncAnswerBarReplay({
    enabled: afterSubmit,
    playUrl: shownAnswerPlayUrl,
    release: answerSettled && shownAnswerPlayUrl === null,
  });
  syncAudioSourceIndicator({
    afterSubmit,
    answerOrigin: shownAnswerOrigin,
    detailsOrigin: shownDetailsOrigin,
    exampleOrigins: exampleOrigins(shownExampleClips),
    exampleUrls: exampleUrls(shownExampleClips),
    answerUrl: shownAnswerPlayUrl,
    detailsUrl: shownDetailsPlayUrl,
    sentenceUrl: exampleOnScreenHasAudio() ? shownAnswerPlayUrl : null,
    annotate: menu.annotate,
    color: menu.color,
    ownDetails: detailsClickOwned,
  });
}

function exampleOrigins(
  clips: Map<number, ExampleClip> | null,
): Map<number, AudioOrigin> | null {
  if (!clips) {
    return null;
  }
  return new Map([...clips].map(([id, clip]) => [id, clip.origin]));
}

function exampleUrls(clips: Map<number, ExampleClip> | null): Map<number, string> | null {
  if (!clips) {
    return null;
  }
  return new Map([...clips].map(([id, clip]) => [id, clip.url]));
}

/** Grammar reviews: drive the answer bar from Bunpro’s prefetch clip. */
function adoptBunproAnswerClip(review: string): void {
  if (!readQuizState().isPostAttempt) {
    return;
  }
  const url = answerBarPrefetchHref();
  if (!url) {
    return;
  }
  shownFor = review;
  shownAnswerOrigin = bunproClipOrigin(url) ?? 'bunpro-rec';
  shownAnswerPlayUrl = url;
  maybeAutoplayTermRecording(review, url, shownAnswerOrigin);
}

function maybeAutoplayTermRecording(
  review: string,
  playUrl: string | null,
  _answerOrigin: AudioOrigin,
): void {
  if (!playUrl) {
    cancelScheduledTermAutoplay();
    return;
  }
  if (!readQuizState().isPostAttempt) {
    return;
  }
  scheduleTermRecordingAutoplay(review, playUrl);
}

function clearShown(): void {
  shownFor = null;
  shownAnswerOrigin = null;
  shownDetailsOrigin = null;
  shownExampleClips = null;
  shownAnswerPlayUrl = null;
  shownDetailsPlayUrl = null;
  answerSettled = false;
  detailsClickOwned = false;
  cueAfterReady = false;
  setActiveTermAutoplayReview(null);
  clearActiveReplacement();
  clearAnswerBarReplay();
  clearAudioSourceIndicator();
}

function onAudioSetting(key: string): void {
  if (!key.startsWith('audio.') || key === 'audio.migrated') {
    return;
  }
  syncAudioPresentation();
  shownFor = null;
  const state = readQuizState();
  if (state.reviewable && reviewKey(state) !== null) {
    void refreshReview(state);
    return;
  }
  void refreshItemPage();
}

function syncAudioPresentation(): void {
  document.documentElement.classList.toggle('bb-audio-color', readAudioMenu().color);
  if (readAudioMenu().realSpeakers) {
    startReplacingAudio();
    return;
  }
  stopReplacingAudio();
  clearActiveReplacement();
}
