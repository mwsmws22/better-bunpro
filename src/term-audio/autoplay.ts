/**
 * When the answer bar owns term audio (JPod etc.) but Bunpro never calls
 * `play()` — e.g. “Audio not available for this item yet” on cloze — we start
 * the recording ourselves after a short wait. If Bunpro did play (and our
 * `src`/`play` hook swapped in the recording), {@link markTermAudioPlayedViaBunpro}
 * cancels the fallback so we do not double-play.
 */

const AUTOPLAY_WAIT_MS = 400;

let activeReviewKey: string | null = null;
let pending: {
  reviewKey: string;
  url: string;
  timer: ReturnType<typeof setTimeout>;
} | null = null;
let playedForReview: string | null = null;
let bunproPlayedForReview: string | null = null;

/** Call when the quiz review key changes so Bunpro-play marks apply to this card. */
export function setActiveTermAutoplayReview(reviewKey: string | null): void {
  if (activeReviewKey === reviewKey) {
    return;
  }
  resetTermAutoplayState();
  activeReviewKey = reviewKey;
}

export function scheduleTermRecordingAutoplay(reviewKey: string, url: string): void {
  if (!url || playedForReview === reviewKey) {
    return;
  }
  if (bunproPlayedForReview === reviewKey) {
    return;
  }
  if (pending?.reviewKey === reviewKey && pending.url === url) {
    return;
  }
  cancelScheduledTermAutoplay();
  activeReviewKey = reviewKey;
  pending = {
    reviewKey,
    url,
    timer: setTimeout(() => {
      pending = null;
      if (playedForReview === reviewKey || bunproPlayedForReview === reviewKey) {
        return;
      }
      // Sentence audio may have appeared after we scheduled (cloze + delayed play
      // control). Never stack term JPod on top of Bunpro sentence TTS.
      if (shouldSkipTermAutoplay?.()) {
        bunproPlayedForReview = reviewKey;
        return;
      }
      playedForReview = reviewKey;
      startFallbackPlayback(url);
    }, AUTOPLAY_WAIT_MS),
  };
}

/**
 * Optional gate checked right before fallback play (e.g. example sentence audio
 * is now on screen). Set from the feature layer to avoid importing quiz DOM here.
 */
let shouldSkipTermAutoplay: (() => boolean) | null = null;

export function setTermAutoplaySkipWhen(shouldSkip: (() => boolean) | null): void {
  shouldSkipTermAutoplay = shouldSkip;
}

/**
 * How fallback autoplay starts the clip. Answer-bar replay registers itself so
 * the play control can show pause while the recording runs.
 */
let playTermRecording: ((url: string) => void) | null = null;

export function setTermAutoplayPlayer(play: ((url: string) => void) | null): void {
  playTermRecording = play;
}

function startFallbackPlayback(url: string): void {
  if (playTermRecording) {
    playTermRecording(url);
    return;
  }
  void new Audio(url).play().catch(() => {
    // Autoplay may be blocked until a gesture; Bunpro’s own play path still works.
  });
}

/** Bunpro started term audio (our hook swapped the clip) — skip fallback autoplay. */
export function markTermAudioPlayedViaBunpro(): void {
  if (activeReviewKey) {
    bunproPlayedForReview = activeReviewKey;
  }
  cancelScheduledTermAutoplay();
}

export function cancelScheduledTermAutoplay(): void {
  if (pending) {
    clearTimeout(pending.timer);
    pending = null;
  }
}

/** New review / feature stop — clear per-review autoplay state. */
export function resetTermAutoplayState(): void {
  cancelScheduledTermAutoplay();
  playedForReview = null;
  bunproPlayedForReview = null;
}
