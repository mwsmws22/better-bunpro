import { afterEach, describe, expect, it } from 'vitest';
import {
  clearActiveReplacement,
  forgetAll,
  originFor,
  remember,
  replacementFor,
  setActiveReplacement,
  urlToPlay,
} from './store';

const MALE = 'https://cdn.example/%E9%A3%9F%E3%81%B9%E3%82%8B-male.mp3';
const FEMALE = 'https://cdn.example/食べる-female.mp3';
const RECORDING = 'blob:https://bunpro.jp/recording';

afterEach(forgetAll);

describe('replacementFor', () => {
  it('finds a recording by either synthesised URL, encoded or not', () => {
    remember([MALE, FEMALE], RECORDING, 'jpod101');

    expect(replacementFor(MALE)).toBe(RECORDING);
    expect(replacementFor(FEMALE)).toBe(RECORDING);
    expect(replacementFor('https://cdn.example/食べる-male.mp3')).toBe(RECORDING);
  });

  it('finds a recording when Bunpro decomposed the kana in the filename', () => {
    const composed = 'https://cdn.example/\u98df\u3079\u308b-male.mp3';
    const decomposed =
      'https://cdn.example/%E9%A3%9F%E3%81%B8%E3%82%99%E3%82%8B-male.mp3';
    remember([composed], RECORDING, 'jpod101');

    expect(replacementFor(decomposed)).toBe(RECORDING);
    expect(urlToPlay(decomposed)).toBe(RECORDING);
  });

  it('leaves a URL we never filed a recording for', () => {
    remember([MALE], RECORDING, 'jisho');
    expect(replacementFor('https://cdn.example/sentence-tts.mp3')).toBeNull();
  });
});

describe('originFor', () => {
  it('remembers which source supplied the recording', () => {
    remember([MALE], RECORDING, 'jisho');

    expect(originFor(MALE)).toBe('jisho');
    expect(originFor('https://cdn.example/sentence-tts.mp3')).toBeNull();
  });
});

describe('setActiveReplacement', () => {
  it('drops the previous card so its URL plays as itself', () => {
    setActiveReplacement([MALE], RECORDING, 'jpod101');
    setActiveReplacement(['https://cdn.example/next-male.mp3'], 'blob:next', 'jisho');

    expect(urlToPlay(MALE)).toBe(MALE);
    expect(urlToPlay('https://cdn.example/next-male.mp3')).toBe('blob:next');

    clearActiveReplacement();
    expect(replacementFor('https://cdn.example/next-male.mp3')).toBeNull();
  });
});

describe('urlToPlay', () => {
  it('plays the recording in place of a synthesised clip, and anything else as asked', () => {
    remember([MALE], RECORDING, 'jpod101');

    expect(urlToPlay(MALE)).toBe(RECORDING);
    expect(urlToPlay('https://cdn.example/sentence-tts.mp3')).toBe(
      'https://cdn.example/sentence-tts.mp3',
    );
  });
});
