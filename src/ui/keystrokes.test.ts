// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isTypingElsewhere } from './keystrokes';

describe('isTypingElsewhere', () => {
  it('is true for a textarea (e.g. Bunpro’s report-bug modal)', () => {
    const field = document.createElement('textarea');
    expect(isTypingElsewhere(field)).toBe(true);
  });

  it('is true for a non-quiz text input', () => {
    const field = document.createElement('input');
    field.type = 'text';
    expect(isTypingElsewhere(field)).toBe(true);
  });

  it('is false for Bunpro’s answer input so quiz hotkeys still work there', () => {
    const field = document.createElement('input');
    field.id = 'js-manual-input';
    field.type = 'text';
    expect(isTypingElsewhere(field)).toBe(false);
  });

  it('is false for non-editable targets', () => {
    expect(isTypingElsewhere(document.createElement('button'))).toBe(false);
    expect(isTypingElsewhere(document.body)).toBe(false);
    expect(isTypingElsewhere(null)).toBe(false);
  });
});
