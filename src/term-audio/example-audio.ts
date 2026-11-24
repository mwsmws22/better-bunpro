import { findClozeSentence, findNativeSentenceCard, findQuizArticle } from '../bunpro/quiz-dom';
import type { StudyQuestion } from '../bunpro/api';
import { readQuizState } from '../bunpro/quiz-state';
import { shownSentence } from '../quiz-sentence/slot';
import { bunproClipOrigin, isBunproSynthesisedAudioUrl, type AudioOrigin } from './origin';
import { prefetchAudioHref } from './prefetch-audio';
import { sentenceStemMatches } from './sentence-match';

/**
 * Sentence-example speakers use this title. Term controls do not:
 * answer-bar play uses Bunpro's default title; Details pitch play has none.
 */
const SENTENCE_PLAY =
  'button[title="Play audio"], button[data-bb-audio-title="Play audio"]';

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
 *   **visible** sentence play button, or a prefetch whose filename is this
 *   sentence (furigana and one cloze gap allowed). A play button alone does
 *   not make a leftover prefetch this card’s file.
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
 * Prefetch URL safe to drive the answer-bar toggle for *this* card.
 * Bunpro often leaves the previous review’s `link#prefetch-audio` in the DOM;
 * never hand that leftover to play/autoplay.
 */
export function answerBarPrefetchHref(): string | null {
  const shown = shownSentenceAudioUrl();
  if (shown !== undefined) {
    return shown;
  }
  const href = prefetchAudioHref();
  if (!href) {
    return null;
  }
  if (href.includes('/audio/vocab/pronunciation/')) {
    return pronunciationPrefetchMatchesCard(href) ? href : null;
  }
  if (isSentencePrefetch(href)) {
    return prefetchMatchesOnScreenSentence(findQuizArticle()) ? href : null;
  }
  return null;
}

/**
 * The injected example owns the answer-bar clip.
 * `undefined` means no injected sentence — fall through to Bunpro’s prefetch.
 * `null` means the injected sentence has no clip (do not use a leftover prefetch).
 */
function shownSentenceAudioUrl(): string | null | undefined {
  const shown = shownSentence();
  if (!shown) {
    return undefined;
  }
  const sentence = shown.sentences[shown.index];
  if (!sentence) {
    return null;
  }
  return bunproClipUrl(sentence.male_audio_url, sentence.female_audio_url);
}

/**
 * Cloze + current `/tts/` prefetch means sentence audio, except when Bunpro’s
 * only sentence control is “Audio not available…” (stale prefetch must not block
 * term JPod). A leftover hidden “not available” must not win over a real Play.
 * Without a Play control, the prefetch stem must match the on-screen sentence.
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
  return prefetchMatchesOnScreenSentence(article);
}

/**
 * The prefetch filename is this card’s sentence: the same text, furigana
 * inlined, or one cloze gap where the answer word was dropped. A different
 * sentence’s filename does not match.
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
  return sentenceStemMatches(stem, onScreen);
}

function isSentencePrefetch(href: string): boolean {
  return isBunproSynthesisedAudioUrl(href) || href.includes('/audio/grammar/');
}

function prefetchSentenceStem(): string | null {
  const href = prefetchAudioHref();
  if (!href || !isSentencePrefetch(href)) {
    return null;
  }
  const stem = audioFilenameStem(href);
  return stem.length > 0 ? stem : null;
}

/**
 * Bunpro filenames are `{stem}-{male|female}.mp3`; ElevenLabs adds a unix
 * timestamp: `{stem}-{male|female}-{ms}.mp3`.
 */
function audioFilenameStem(href: string): string {
  let file: string;
  try {
    file = decodeURIComponent(href.slice(href.lastIndexOf('/') + 1));
  } catch {
    return '';
  }
  return file.replace(/-(male|female)(-\d+)?\.mp3$/i, '').replace(/\.mp3$/i, '');
}

function pronunciationPrefetchMatchesCard(href: string): boolean {
  const stem = audioFilenameStem(href);
  if (!stem) {
    return false;
  }
  const answers = readQuizState().answers;
  if (answers.some((answer) => answer.includes(stem) || stem.includes(answer))) {
    return true;
  }
  const text = findQuizArticle()?.textContent ?? '';
  return text.includes(stem);
}

function onScreenSentenceText(article: HTMLElement | null): string {
  const cloze = article?.querySelector('.bp-quiz-question')?.textContent?.trim();
  if (cloze) {
    return cloze;
  }
  return findClozeSentence()?.textContent?.trim() ?? '';
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
 * uses `/audio/vocab/tts/…` or `/audio/vocab/gemini/…`; term pronunciation uses
 * `/audio/vocab/pronunciation/…`. Never trust this alone — see
 * {@link exampleOnScreenHasAudio}.
 */
function prefetchIsExampleSentenceAudio(): boolean {
  const href = prefetchAudioHref();
  if (!href) {
    return false;
  }
  return isBunproSynthesisedAudioUrl(href);
}

function isVisiblyDisplayed(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

/**
 * The file Bunpro's own play button will load. The site remembers the last
 * voice in `audio-last-gender` and plays that one.
 */
export function bunproClipUrl(
  male: string | null | undefined,
  female: string | null | undefined,
): string | null {
  const voice = readAudioGender();
  if (voice === 'female') {
    return female || male || null;
  }
  return male || female || null;
}

function readAudioGender(): 'male' | 'female' {
  try {
    return localStorage.getItem('audio-last-gender') === 'Female' ? 'female' : 'male';
  } catch {
    return 'male';
  }
}

export interface ExampleClip {
  origin: AudioOrigin;
  url: string;
}

/** Info Examples list clips, keyed by study-question id. */
export function exampleClipsFromSentences(
  sentences: readonly StudyQuestion[],
): Map<number, ExampleClip> {
  const clips = new Map<number, ExampleClip>();
  for (const sentence of sentences) {
    const url = bunproClipUrl(sentence.male_audio_url, sentence.female_audio_url);
    const origin = bunproClipOrigin(url);
    if (url && origin) {
      clips.set(sentence.id, { origin, url });
    }
  }
  return clips;
}

/** Origins for Info Examples list play buttons, keyed by study-question id. */
export function exampleOriginsFromSentences(
  sentences: readonly StudyQuestion[],
): Map<number, AudioOrigin> {
  const origins = new Map<number, AudioOrigin>();
  for (const [id, clip] of exampleClipsFromSentences(sentences)) {
    origins.set(id, clip.origin);
  }
  return origins;
}
