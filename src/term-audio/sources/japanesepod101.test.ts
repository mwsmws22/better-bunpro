import { describe, expect, it } from 'vitest';
import { isSameWord } from './source';

describe('isSameWord', () => {
  it('keeps a result whose reading matches the word we asked for', () => {
    expect(isSameWord({ term: '取り計らう', reading: 'とりはからう' }, 'とりはからう')).toBe(true);
  });

  it('drops a homograph that is read differently', () => {
    expect(isSameWord({ term: '行く', reading: 'いく' }, 'ゆく')).toBe(false);
  });

  it('folds katakana to hiragana so グラグラ matches ぐらぐら, not くらくら', () => {
    expect(isSameWord({ term: 'グラグラ', reading: 'グラグラ' }, 'ぐらぐら')).toBe(true);
    expect(isSameWord({ term: 'グラグラ', reading: 'グラグラ' }, 'くらくら')).toBe(false);
  });

  it('drops a row with no reading at all', () => {
    expect(isSameWord({ term: '食べる', reading: 'たべる' }, null)).toBe(false);
    expect(isSameWord({ term: '食べる', reading: 'たべる' }, '  ')).toBe(false);
  });
});
