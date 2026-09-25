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
import { exampleOnScreenHasAudio, exampleOriginsFromSentences } from '../../term-audio/example-audio';
import { grammarSlugFromPath, reviewableFromGrammarSlug } from '../../term-audio/grammar-page';
import { clearAudioSourceIndicator, syncAudioSourceIndicator } from '../../term-audio/indicator';
import { loadTermAudio } from '../../term-audio/load';
import type { AudioOrigin } from '../../term-audio/origin';
import { bunproClipOrigin, isRealAudioOrigin } from '../../term-audio/origin';
import { prefetchAudioHref } from '../../term-audio/prefetch-audio';
import { startReplacingAudio, stopReplacingAudio } from '../../term-audio/playback';
import { forgetReplacements } from '../../term-audio/replacements';
import { reviewableFromVocabSlug, vocabSlugFromPath } from '../../term-audio/vocab-page';
import type { Feature } from '../registry';

let stopWatchingQuiz: (() => void) | null = null;
let stopWatchingRemounts: (() => void) | null = null;
let shownFor: string | null = null;
let shownAnswerOrigin: AudioOrigin | null = null;
let shownDetailsOrigin: AudioOrigin | null = null;
let shownExampleOrigins: Map<number, AudioOrigin> | null = null;
/** Blob URL for answer-bar replay when Bunpro left the play slot empty. */
let shownAnswerPlayUrl: string | null = null;
/** Details / grammar pages tint as soon as origins are ready — no answer step. */
let cueAfterReady = false;

export const humanTermAudioFeature: Feature = {
  id: 'human-term-audio',
  title: 'Play real speakers instead of TTS audio',
  description:
    'When Bunpro would play synthesised term audio (TTS / text-to-speech), prefer a real ' +
    'recording instead — looked up like Yomitan (JapanesePod101, then Jisho). Play buttons ' +
    'are white for TTS and blue for real audio; the tooltip names the source.',
  enabledByDefault: true,

  start() {
    injectStyles();
    startReplacingAudio();
    setTermAutoplaySkipWhen(() => exampleOnScreenHasAudio());
    setTermAutoplayPlayer(playAnswerBarRecording);
    stopWatchingQuiz = watchQuizState(onQuizStateChange);
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
        // appeared). Flip the answer cue off JPod without re-fetching.
        if (
          shownAnswerOrigin !== null &&
          isRealAudioOrigin(shownAnswerOrigin) &&
          exampleOnScreenHasAudio()
        ) {
          shownAnswerOrigin = 'bunpro-tts';
          const prefetch = prefetchAudioHref();
          if (prefetch) {
            shownAnswerPlayUrl = prefetch;
          }
          cancelScheduledTermAutoplay();
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
        shownExampleOrigins !== null
      ) {
        paintCues();
      }
      void refreshItemPage();
    });
  },

  stop() {
    stopWatchingRemounts?.();
    stopWatchingRemounts = null;
    stopWatchingQuiz?.();
    stopWatchingQuiz = null;
    stopReplacingAudio();
    forgetReplacements();
    clearAudioSourceIndicator();
    clearAnswerBarReplay();
    setTermAutoplaySkipWhen(null);
    setTermAutoplayPlayer(null);
    resetTermAutoplayState();
    shownFor = null;
    shownAnswerOrigin = null;
    shownDetailsOrigin = null;
    shownExampleOrigins = null;
    shownAnswerPlayUrl = null;
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
    shownExampleOrigins = null;
    shownAnswerPlayUrl = null;
    clearAudioSourceIndicator();
    clearAnswerBarReplay();
    setActiveTermAutoplayReview(review);
  }

  void loadExampleOrigins(term, () => reviewKey(readQuizState()) === review);

  if (term.type !== 'vocab') {
    // Grammar (and other non-vocab): own Bunpro’s clip as play↔pause when present.
    adoptBunproAnswerClip(review);
    if (shownExampleOrigins !== null || shownAnswerPlayUrl !== null) {
      paintCues();
    }
    return;
  }

  await loadTermAudio(term, (origins) => {
    if (reviewKey(readQuizState()) !== review) {
      return;
    }
    shownFor = review;
    // Cloze sentence detection can flicker after submit (Play control unmounts).
    // Once this review’s answer bar is on Bunpro TTS, do not flip it to JPod.
    const keepBunproAnswer =
      shownAnswerOrigin !== null &&
      !isRealAudioOrigin(shownAnswerOrigin) &&
      isRealAudioOrigin(origins.answer) &&
      exampleOnScreenHasAudio();
    shownAnswerOrigin = keepBunproAnswer ? shownAnswerOrigin : origins.answer;
    shownDetailsOrigin = origins.details;
    shownAnswerPlayUrl = origins.answerPlayUrl;
    if (keepBunproAnswer) {
      const prefetch = prefetchAudioHref();
      if (prefetch) {
        shownAnswerPlayUrl = prefetch;
      }
    }
    paintCues();
    maybeAutoplayTermRecording(review, shownAnswerPlayUrl, shownAnswerOrigin!);
  });

  if (reviewKey(readQuizState()) !== review) {
    return;
  }
  if (
    shownFor === review &&
    shownAnswerOrigin === null &&
    shownDetailsOrigin === null &&
    shownExampleOrigins === null
  ) {
    clearShown();
  } else if (
    shownAnswerOrigin !== null ||
    shownDetailsOrigin !== null ||
    shownExampleOrigins !== null
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
    shownExampleOrigins = null;
    clearAudioSourceIndicator();
  } else if (shownDetailsOrigin === null) {
    return;
  }

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
      shownAnswerOrigin = origins.answer;
      shownDetailsOrigin = origins.details;
      paintCues();
    },
    { ignoreExampleAudio: true },
  );

  if (vocabSlugFromPath() !== slug) {
    return;
  }
  if (shownFor === key && shownDetailsOrigin === null && shownExampleOrigins === null) {
    clearShown();
  } else if (shownDetailsOrigin !== null || shownExampleOrigins !== null) {
    paintCues();
  }
}

async function refreshGrammarPage(slug: string): Promise<void> {
  const key = `page:grammar:${slug}`;
  cueAfterReady = true;
  if (shownFor === key && shownExampleOrigins !== null) {
    paintCues();
    return;
  }
  if (shownFor !== key) {
    shownFor = key;
    shownAnswerOrigin = null;
    shownDetailsOrigin = null;
    shownExampleOrigins = null;
    clearAudioSourceIndicator();
  } else if (shownExampleOrigins === null) {
    return;
  }

  const term = await reviewableFromGrammarSlug(slug);
  if (!term || grammarSlugFromPath() !== slug) {
    return;
  }

  await loadExampleOrigins(term, () => grammarSlugFromPath() === slug);

  if (grammarSlugFromPath() !== slug) {
    return;
  }
  if (shownFor === key && shownExampleOrigins === null) {
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
    shownExampleOrigins = exampleOriginsFromSentences(sentences);
    paintCues();
  } catch {
    // Term-audio lookup already warns; Examples cues are best-effort.
  }
}

function paintCues(): void {
  const afterSubmit = cueAfterReady || readQuizState().isPostAttempt;
  // Always own the answer bar as play↔pause when we have a clip — never Bunpro’s
  // X / timer open-player chrome.
  syncAnswerBarReplay({
    enabled: afterSubmit && shownAnswerPlayUrl !== null,
    playUrl: shownAnswerPlayUrl,
  });
  syncAudioSourceIndicator({
    afterSubmit,
    answerOrigin: shownAnswerOrigin,
    detailsOrigin: shownDetailsOrigin,
    exampleOrigins: shownExampleOrigins,
  });
}

/** Grammar reviews: drive the answer bar from Bunpro’s prefetch clip. */
function adoptBunproAnswerClip(review: string): void {
  if (!readQuizState().isPostAttempt) {
    return;
  }
  const url = prefetchAudioHref();
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
  shownExampleOrigins = null;
  shownAnswerPlayUrl = null;
  cueAfterReady = false;
  setActiveTermAutoplayReview(null);
  clearAnswerBarReplay();
  clearAudioSourceIndicator();
}
