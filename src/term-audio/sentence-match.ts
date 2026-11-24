import { HIRAGANA, KANJI, KATAKANA } from '../japanese/characters';

/**
 * Does this audio filename belong to the sentence on screen?
 *
 * A leftover prefetch from the previous review is a different sentence. Matching
 * by “every character appears somewhere later” accepts those leftovers, and the
 * answer bar then plays the wrong file. Furigana is inserted kana, and a cloze
 * blank drops the answer word, so the stem will not be a copy of the prompt —
 * but it still has to be the same sentence.
 */

const KANA = new RegExp(`^[${HIRAGANA}${KATAKANA}]$`);
const KANJI_CHAR = new RegExp(`^[${KANJI}]$`);

/** Share of the filename stem that must line up with the prompt. */
const MIN_COVERAGE = 0.55;
/** Kana-only prompts have no kanji to disprove a lucky skip, so demand more. */
const MIN_KANA_COVERAGE = 0.8;

export function sentenceStemMatches(stem: string, onScreen: string): boolean {
  const needle = normalize(stem);
  const hay = normalize(onScreen);
  if (needle.length === 0 || hay.length === 0) {
    return false;
  }
  if (sameSentenceText(needle, hay)) {
    return true;
  }
  if (!screenKanjiAreInStem(needle, hay)) {
    return false;
  }
  return aligns(needle, hay, coverageNeeded(needle, hay));
}

function normalize(text: string): string {
  return text.normalize('NFKC').replace(/\s+/g, '');
}

/**
 * One string contains the other as a sentence, not as a short fragment.
 * `です` sits inside almost every prompt; a real filename stem is most of the line.
 */
function sameSentenceText(needle: string, hay: string): boolean {
  return containsSentence(hay, needle) || containsSentence(needle, hay);
}

function containsSentence(host: string, part: string): boolean {
  if (part.length < 8 || !host.includes(part)) {
    return false;
  }
  return part.length / host.length >= 0.45;
}

function screenKanjiAreInStem(stem: string, screen: string): boolean {
  const kanji = [...screen].filter((ch) => KANJI_CHAR.test(ch));
  if (kanji.length === 0) {
    return true;
  }
  const covered = kanji.filter((ch) => stem.includes(ch)).length;
  return covered / kanji.length >= 0.8;
}

function coverageNeeded(stem: string, screen: string): number {
  const stemKanji = [...stem].some((ch) => KANJI_CHAR.test(ch));
  const screenKanji = [...screen].some((ch) => KANJI_CHAR.test(ch));
  return stemKanji || screenKanji ? MIN_COVERAGE : MIN_KANA_COVERAGE;
}

/**
 * Line the stem up with the prompt. Kana that is not the next stem character is
 * furigana and can be skipped. One gap in the stem is the cloze blank (the
 * answer word is missing from the prompt). Kanji is never skipped.
 */
function aligns(stem: string, screen: string, minCoverage: number): boolean {
  if (covers(align(stem, screen, 0), stem.length, minCoverage)) {
    return true;
  }
  const maxGap = Math.floor(stem.length * (1 - minCoverage));
  for (let gapStart = 0; gapStart < stem.length; gapStart += 1) {
    for (let gapEnd = gapStart + 1; gapEnd <= stem.length && gapEnd - gapStart <= maxGap; gapEnd += 1) {
      const left = align(stem.slice(0, gapStart), screen, 0);
      if (!left) {
        continue;
      }
      const right = align(stem.slice(gapEnd), screen, left.end);
      if (!right) {
        continue;
      }
      const matched = left.matched + right.matched;
      if (matched / stem.length >= minCoverage) {
        return true;
      }
    }
  }
  return false;
}

function covers(result: Alignment | null, stemLength: number, minCoverage: number): boolean {
  return result !== null && result.matched / stemLength >= minCoverage;
}

interface Alignment {
  end: number;
  matched: number;
}

function align(part: string, screen: string, from: number): Alignment | null {
  let index = from;
  let skipped = 0;
  let matched = 0;
  for (const ch of part) {
    while (index < screen.length && screen[index] !== ch && KANA.test(screen[index] ?? '')) {
      index += 1;
      skipped += 1;
      if (skipped > matched * 3 + 8) {
        return null;
      }
    }
    if (screen[index] !== ch) {
      return null;
    }
    index += 1;
    matched += 1;
  }
  return { end: index, matched };
}
