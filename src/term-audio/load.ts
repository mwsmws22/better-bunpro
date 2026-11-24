import type { Reviewable } from '../bunpro/api';
import { fetchReviewable } from '../bunpro/api';
import type { ReviewableRef } from '../bunpro/quiz-state';
import { warnOnce } from '../report';
import { answerBarPrefetchHref, exampleOnScreenHasAudio } from './example-audio';
import type { AudioOrigin } from './origin';
import { bunproClipOrigin, bunproOrigin, isBunproSynthesisedAudioUrl } from './origin';
import { findReplacement } from './replacements';
import { synthesisedTermAudio } from './term';

export interface LoadTermAudioOptions {
  /**
   * Treat the answer bar like Details — always use the term lookup result.
   * Vocabulary detail pages have no example-sentence clip to protect.
   */
  ignoreExampleAudio?: boolean;
  /**
   * Look up a real speaker for this term. When false, every control stays on
   * the Bunpro file it already has.
   */
  useRealSpeakers?: boolean;
}

/** Origins for the quiz answer-bar vs Details pitch-accent play controls. */
export interface TermAudioOrigins {
  answer: AudioOrigin;
  details: AudioOrigin;
  /**
   * Clip for the answer-bar toggle. A sentence we cannot identify is null —
   * never the term file standing in for that sentence.
   */
  answerPlayUrl: string | null;
  /** Clip the Details pitch control should play. */
  detailsPlayUrl: string | null;
  /** Term TTS urls to rewrite, only when a recording is bound for this card. */
  rewriteFrom: readonly string[];
  /** Dictionary blob when one will play. */
  recordingUrl: string | null;
  /** False on the placeholder paint before the lookup finishes. */
  lookupDone: boolean;
}

/**
 * Loads term-audio origins for the quiz answer bar and Details pitch play.
 *
 * ## Policy (do not collapse these into one origin)
 *
 * 1. **Details** — always term audio. Always dictionary-lookup. Blue when real.
 * 2. **Answer bar** — if `exampleOnScreenHasAudio()` (sentence clip on this
 *    review), stay on that sentence’s own file. Never substitute the term
 *    recording, and never fall back to the term TTS file when the sentence
 *    file is not identified.
 *    Otherwise the answer bar is term audio → same lookup as Details when
 *    real speakers are on for this surface.
 * 3. Detection rules live in `example-audio.ts`. A prefetch link is this
 *    card’s sentence only when the filename lines up with the prompt.
 */
export async function loadTermAudio(
  term: ReviewableRef,
  onOrigins: (origins: TermAudioOrigins) => void,
  options: LoadTermAudioOptions = {},
): Promise<void> {
  try {
    const item = await fetchReviewable(term);
    if (!item || !hasTermAudio(item)) {
      return;
    }

    const bunpro = bunproOrigin(item.has_tts_audio);
    onOrigins(unresolved(bunpro));

    const audio = synthesisedTermAudio(item);
    const termUrl = audio?.ttsUrls[0] ?? firstClip(item);
    if (!audio) {
      onOrigins(bunproOnly(bunpro, termUrl, options.ignoreExampleAudio === true));
      return;
    }

    const speakers = options.useRealSpeakers !== false;
    const hit = speakers ? await findReplacement(audio) : null;
    const leaveAnswerOnBunpro =
      !options.ignoreExampleAudio && exampleOnScreenHasAudio();
    const sentenceUrl = leaveAnswerOnBunpro ? answerBarPrefetchHref() : null;
    const answerBunpro = originForBunproPlayUrl(
      leaveAnswerOnBunpro ? sentenceUrl : termUrl,
      bunpro,
    );
    const termOrigin = originForBunproPlayUrl(termUrl, bunpro);

    onOrigins({
      answer: leaveAnswerOnBunpro ? answerBunpro : (hit?.origin ?? answerBunpro),
      details: hit?.origin ?? termOrigin,
      answerPlayUrl: leaveAnswerOnBunpro ? sentenceUrl : (hit?.url ?? termUrl),
      detailsPlayUrl: hit?.url ?? termUrl,
      // Sentence cards must not rewrite: Bunpro’s answer-bar file is not the
      // term, and a global swap would play the term recording over it.
      // Details on those cards is played from the button instead.
      rewriteFrom: hit && !leaveAnswerOnBunpro ? audio.ttsUrls : [],
      recordingUrl: hit?.url ?? null,
      lookupDone: true,
    });
  } catch (error) {
    warnOnce('term-audio', 'Could not replace synthesised term audio:', error);
  }
}

function unresolved(origin: AudioOrigin): TermAudioOrigins {
  return {
    answer: origin,
    details: origin,
    answerPlayUrl: null,
    detailsPlayUrl: null,
    rewriteFrom: [],
    recordingUrl: null,
    lookupDone: false,
  };
}

/** Bunpro already has a human recording — play it, do not look up another. */
function bunproOnly(
  origin: AudioOrigin,
  termUrl: string | null,
  ignoreExampleAudio: boolean,
): TermAudioOrigins {
  const sentenceUrl = ignoreExampleAudio ? null : answerBarPrefetchHref();
  return {
    answer: origin,
    details: origin,
    answerPlayUrl: sentenceUrl ?? termUrl,
    detailsPlayUrl: termUrl,
    rewriteFrom: [],
    recordingUrl: null,
    lookupDone: true,
  };
}

function firstClip(item: Reviewable): string | null {
  return item.male_audio_url ?? item.female_audio_url;
}

/** Prefer classic / Gemini / ElevenLabs from the clip URL; else the API TTS flag. */
function originForBunproPlayUrl(url: string | null, fallback: AudioOrigin): AudioOrigin {
  if (url && isBunproSynthesisedAudioUrl(url)) {
    return bunproClipOrigin(url) ?? fallback;
  }
  return fallback;
}

function hasTermAudio(item: Reviewable): boolean {
  return item.male_audio_url !== null || item.female_audio_url !== null;
}
