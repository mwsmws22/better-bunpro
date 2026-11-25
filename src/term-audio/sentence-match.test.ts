import { describe, expect, it } from 'vitest';
import { sentenceStemMatches } from './sentence-match';

describe('sentenceStemMatches', () => {
  it('matches a sentence that is the filename, punctuation included', () => {
    const sentence = '三点差を覆して勝利するとは…';
    expect(sentenceStemMatches(sentence, sentence)).toBe(true);
  });

  it('matches a prompt whose furigana is written inline after the kanji', () => {
    expect(
      sentenceStemMatches(
        '抽象の概念を理解する。',
        '抽象ちゅうしょうの概念がいねんを理解りかいする。',
      ),
    ).toBe(true);
  });

  it('matches a cloze whose ruby readings are parenthesized in textContent', () => {
    expect(
      sentenceStemMatches(
        '牛乳やバターは酪農によって作られました。',
        '牛乳(ぎゅうにゅう)やバターはによって作(つく)られました。',
      ),
    ).toBe(true);
  });

  it('matches a cloze whose filename dropped the quotation marks', () => {
    expect(
      sentenceStemMatches(
        'コーチこれくらいの試験で挫けるんじゃないお前はヘコタレなのか',
        'コーチ：「これくらいの試験(しけん)でんじゃない！お前(まえ)はヘコタレなのか？」',
      ),
    ).toBe(true);
  });

  it('matches a cloze prompt that dropped the answer word and inlined the furigana', () => {
    expect(
      sentenceStemMatches(
        '理ことわりをわきまえていない妹がする事はいつも筋が通っていない',
        'をわきまえていない妹いもうとがする事ことはいつも筋すじが通とおっていない。',
      ),
    ).toBe(true);
  });

  it('matches a cloze prompt that dropped the answer in the middle of the line', () => {
    expect(
      sentenceStemMatches(
        '妻：「これ以上私に譲歩を求めないでってば！」',
        '妻：「これ以上私にを求めないでってば！」',
      ),
    ).toBe(true);
  });

  it('rejects a leftover sentence that merely shares a few kana', () => {
    expect(
      sentenceStemMatches(
        '京都市は全国に先駆けて省エネ活動に取り組んでいます。',
        '爪楊枝で必死に歯を抉っている時に…',
      ),
    ).toBe(false);
    expect(
      sentenceStemMatches(
        'レッスンを怠けていてばかりだったので',
        '爪楊枝で必死に歯を抉っている時に…',
      ),
    ).toBe(false);
  });

  it('rejects a short fragment that happens to sit inside the prompt', () => {
    expect(sentenceStemMatches('です', 'この樽にはお酒が入っています。')).toBe(false);
    expect(sentenceStemMatches('sentence', 'This is a grammar sentence.')).toBe(false);
  });
});
