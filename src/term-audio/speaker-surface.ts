/** Where term TTS may be replaced with a real speaker. */
export type SpeakerSurface = 'reviews' | 'vocab' | 'both' | 'none';

/** The two checkboxes share one stored value. */
export function speakerSurface(reviews: boolean, vocab: boolean): SpeakerSurface {
  if (reviews && vocab) {
    return 'both';
  }
  if (reviews) {
    return 'reviews';
  }
  if (vocab) {
    return 'vocab';
  }
  return 'none';
}

export function surfaceChecked(surface: SpeakerSurface, where: 'reviews' | 'vocab'): boolean {
  return surface === 'both' || surface === where;
}
