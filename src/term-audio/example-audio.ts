import { findClozeSentence, findNativeSentenceCard, findQuizArticle } from '../bunpro/quiz-dom';
import type { StudyQuestion } from '../bunpro/api';
import { shownSentence } from '../quiz-sentence/slot';
import { bunproClipOrigin, type AudioOrigin } from './origin';

/**
 * Sentence-example speakers use this title. Term controls do not:
 * answer-bar play uses Bunpro's default title; Details pitch play has none.
 */
const SENTENCE_PLAY = 'button[title="Play audio"]';

/**
 * Whether the on-screen *example sentence* has its own clip.
 *
 * ## Audio cue / rewrite policy (READ BEFORE CHANGING)
 *
 * Two different play controls, two jobs:
 *
 * 1. **Answer bar** (green InputManual) — follows whatever Bunpro plays there.
 *    - Example sentence on screen **has its own audio** (often Bunpro TTS of the
 *      sentence) → leave that alone → cue **white / Bunpro TTS** even if JPod
 *      exists for the vocab term.
 *    - No example clip (term-only review) → answer bar is term audio → look up
 *      JPod/Jisho → cue **blue** when a recording exists.
 *
 * 2. **Details pitch play** — always term-only → always look up → blue when real.
 *
 * ## How we detect “example has audio” (easy to get wrong)
 *
 * - Do **not** treat every `button[title="Play audio"]` in the quiz as an
 *   example. Bunpro leaves **hidden** footer speakers on term-only cards; that
 *   false positive forced white Bunpro TTS when the answer bar should be JPod.
 * - Do **not** trust `/audio/vocab/tts/` prefetch alone. Bunpro can leave the
 *   *previous* review’s sentence TTS prefetch while the new card is term-only
 *   (answer plays JPod, cue stayed white). Require a sentence surface too.
 * - Do **not** treat cloze prompt + leftover `/tts/` prefetch as example audio.
 *   Cloze always has a sentence on screen; prefetch often lags a card behind
 *   (silence when Bunpro’s play is “Audio not available” and we blocked JPod).
 * - Do **not** require the speaker to be visible. After submit, the sentence can
 *   be on screen with Bunpro’s play still size-hidden while prefetch already
 *   points at the sentence TTS file.
 * - Reliable signals: our injected `shownSentence` audio URLs, a real
 *   `study-question-*` / `data-bb-study-question` card with a play button, a
 *   **visible** sentence play button, study-question / injected surface +
 *   prefetch under `/audio/vocab/tts/`, cloze with `/tts/` prefetch unless Bunpro
 *   shows “Audio not available…”, or question text that **matches** the `/tts/`
 *   prefetch filename (furigana-tolerant subsequence). Cloze blanks omit the
 *   answer word; after submit the footer Play control often disappears too.
 */
export function exampleOnScreenHasAudio(): boolean {
  const shown = shownSentence();
  if (shown) {
    const sentence = shown.sentences[shown.index];
    if (sentence && studyQuestionHasAudio(sentence)) {
      return true;
    }
  }

  if (findNativeSentenceCard()?.querySelector(SENTENCE_PLAY)) {
    return true;
  }

  const article = findQuizArticle();
  if (!article) {
    return prefetchBackedSentenceAudio(null);
  }
  if (article.querySelector(`aside[data-bb-study-question] ${SENTENCE_PLAY}`)) {
    return true;
  }
  if (quizHasVisibleSentencePlay(article)) {
    return true;
  }
  return prefetchBackedSentenceAudio(article);
}

function studyQuestionHasAudio(sentence: StudyQuestion): boolean {
  return sentence.male_audio_url !== null || sentence.female_audio_url !== null;
}

/**
 * Prefetch `/tts/` only with a sentence surface — study-question / injected
 * card, cloze that is not “Audio not available…”, or question text that matches
 * the prefetch filename (not a lagging leftover from the previous review).
 */
function prefetchBackedSentenceAudio(article: HTMLElement | null): boolean {
  if (!prefetchIsExampleSentenceAudio()) {
    return false;
  }
  if (findNativeSentenceCard()) {
    return true;
  }
  if (article?.querySelector(`aside[data-bb-study-question], [id^="study-question-"]`)) {
    return true;
  }
  // Injected example slot without a clip already returned false above; if the
  // slot is mounted we still allow prefetch (play may be hidden after submit).
  if (shownSentence()) {
    return true;
  }
  // Cloze: blank drops the answer word from the prompt, and after submit Bunpro
  // often removes the footer Play control entirely. Prefer `/tts/` prefetch on a
  // cloze prompt unless Bunpro explicitly says audio is unavailable (that is the
  // leftover-prefetch / silence case). Term-only leftovers have no cloze prompt.
  if (article && clozeHasPrefetchedSentenceAudio(article)) {
    return true;
  }
  return prefetchMatchesOnScreenSentence(article);
}

/**
 * Cloze + current `/tts/` prefetch means sentence audio, except when Bunpro’s
 * only sentence control is “Audio not available…” (stale prefetch must not block
 * term JPod). A leftover hidden “not available” must not win over a real Play.
 */
function clozeHasPrefetchedSentenceAudio(article: HTMLElement): boolean {
  if (!article.querySelector('.bp-quiz-question')) {
    return false;
  }
  if (article.querySelector(SENTENCE_PLAY)) {
    return true;
  }
  if (article.querySelector('button[title="Audio not available for this item yet"]')) {
    return false;
  }
  return true;
}

/**
 * When the full sentence is on screen (no cloze blank gap), Bunpro’s `/tts/`
 * prefetch filename is the bare sentence while the prompt may mix in furigana.
 * Treat as current when every character of the prefetch stem appears in order.
 */
function prefetchMatchesOnScreenSentence(article: HTMLElement | null): boolean {
  const stem = prefetchSentenceStem();
  if (!stem) {
    return false;
  }
  const onScreen = onScreenSentenceText(article);
  if (!onScreen) {
    return false;
  }
  return isCharacterSubsequence(stem, onScreen);
}

function prefetchSentenceStem(): string | null {
  const href =
    document.querySelector<HTMLLinkElement>('link#prefetch-audio')?.href ??
    document.querySelector<HTMLLinkElement>('link[rel="prefetch"][as="audio"]')?.href ??
    null;
  if (!href || !href.includes('/audio/vocab/tts/')) {
    return null;
  }
  let file: string;
  try {
    file = decodeURIComponent(href.slice(href.lastIndexOf('/') + 1));
  } catch {
    return null;
  }
  const stem = file.replace(/-(male|female)\.mp3$/i, '');
  return stem.length > 0 ? stem : null;
}

function onScreenSentenceText(article: HTMLElement | null): string {
  const cloze = article?.querySelector('.bp-quiz-question')?.textContent?.trim();
  if (cloze) {
    return cloze;
  }
  return findClozeSentence()?.textContent?.trim() ?? '';
}

/** True when every character of `needle` appears in order in `haystack`. */
function isCharacterSubsequence(needle: string, haystack: string): boolean {
  let from = 0;
  for (const ch of needle) {
    const at = haystack.indexOf(ch, from);
    if (at === -1) {
      return false;
    }
    from = at + 1;
  }
  return true;
}

/** Visible speakers only — ignores Bunpro’s hidden footer leftovers. */
function quizHasVisibleSentencePlay(article: HTMLElement): boolean {
  for (const node of article.querySelectorAll(SENTENCE_PLAY)) {
    if (node instanceof HTMLElement && isVisiblyDisplayed(node)) {
      return true;
    }
  }
  return false;
}

/**
 * Bunpro prefetches the clip the current UI will play. Example/sentence TTS
 * uses `/audio/vocab/tts/…`; term pronunciation uses `/audio/vocab/pronunciation/…`.
 * Never trust this alone — see {@link exampleOnScreenHasAudio}.
 */
function prefetchIsExampleSentenceAudio(): boolean {
  const href =
    document.querySelector<HTMLLinkElement>('link#prefetch-audio')?.href ??
    document.querySelector<HTMLLinkElement>('link[rel="prefetch"][as="audio"]')?.href ??
    null;
  if (!href) {
    return false;
  }
  return href.includes('/audio/vocab/tts/');
}

function isVisiblyDisplayed(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

/** Origins for Info Examples list play buttons, keyed by study-question id. */
export function exampleOriginsFromSentences(
  sentences: readonly StudyQuestion[],
): Map<number, AudioOrigin> {
  const origins = new Map<number, AudioOrigin>();
  for (const sentence of sentences) {
    const origin = bunproClipOrigin(sentence.female_audio_url ?? sentence.male_audio_url);
    if (origin) {
      origins.set(sentence.id, origin);
    }
  }
  return origins;
}
