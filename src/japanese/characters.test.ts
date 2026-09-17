import { describe, expect, it } from 'vitest';
import { isEntirelyKana, toHiragana } from './characters';

describe('toHiragana', () => {
  it('folds katakana vocabulary to hiragana for dictionary lookups', () => {
    expect(toHiragana('グラグラ')).toBe('ぐらぐら');
    expect(toHiragana('いきがる')).toBe('いきがる');
  });
});

describe('isEntirelyKana', () => {
  it('accepts mixed hiragana and katakana', () => {
    expect(isEntirelyKana('グラグラ')).toBe(true);
    expect(isEntirelyKana('粋がる')).toBe(false);
  });
});
