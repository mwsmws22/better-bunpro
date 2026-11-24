import { describe, expect, it } from 'vitest';
import { speakerSurface, surfaceChecked } from './speaker-surface';

describe('speakerSurface', () => {
  it('keeps each checkbox independent', () => {
    expect(speakerSurface(true, true)).toBe('both');
    expect(speakerSurface(true, false)).toBe('reviews');
    expect(speakerSurface(false, true)).toBe('vocab');
    expect(speakerSurface(false, false)).toBe('none');
  });

  it('reads a stored value back onto the two checkboxes', () => {
    expect(surfaceChecked('both', 'reviews')).toBe(true);
    expect(surfaceChecked('both', 'vocab')).toBe(true);
    expect(surfaceChecked('reviews', 'vocab')).toBe(false);
    expect(surfaceChecked('none', 'reviews')).toBe(false);
  });
});
