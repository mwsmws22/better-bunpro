// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Reviewable } from '../bunpro/api';
import * as api from '../bunpro/api';

vi.mock('./replacements', () => ({
  findReplacement: vi.fn(),
}));

vi.mock('./example-audio', () => ({
  exampleOnScreenHasAudio: vi.fn(() => false),
  answerBarPrefetchHref: vi.fn(() => null),
}));

import { answerBarPrefetchHref, exampleOnScreenHasAudio } from './example-audio';
import { findReplacement } from './replacements';
import { loadTermAudio, type TermAudioOrigins } from './load';

const TERM_TTS = 'https://cdn.example/委ねる-male.mp3';

function pending(): TermAudioOrigins {
  return {
    answer: 'bunpro-tts',
    details: 'bunpro-tts',
    answerPlayUrl: null,
    detailsPlayUrl: null,
    rewriteFrom: [],
    recordingUrl: null,
    lookupDone: false,
  };
}

const TERM = { id: 1, type: 'vocab' as const };

const TTS_ITEM: Reviewable = {
  title: '委ねる',
  kana: 'ゆだねる',
  has_tts_audio: true,
  male_audio_url: 'https://cdn.example/委ねる-male.mp3',
  female_audio_url: null,
};

const JPOD_HIT = { origin: 'jpod101' as const, url: 'blob:jpod' };

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(exampleOnScreenHasAudio).mockReturnValue(false);
  vi.mocked(answerBarPrefetchHref).mockReturnValue(null);
});

function collectOrigins(
  run: (onOrigins: (origins: TermAudioOrigins) => void) => Promise<void>,
): Promise<TermAudioOrigins[]> {
  const origins: TermAudioOrigins[] = [];
  return run((o) => origins.push(o)).then(() => origins);
}

describe('loadTermAudio', () => {
  it('keeps the answer bar on Bunpro when the example has audio, but still looks up for Details', async () => {
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);
    vi.mocked(exampleOnScreenHasAudio).mockReturnValue(true);
    vi.mocked(findReplacement).mockResolvedValue(JPOD_HIT);

    const origins = await collectOrigins((onOrigins) => loadTermAudio(TERM, onOrigins));

    expect(findReplacement).toHaveBeenCalled();
    expect(origins).toEqual([
      pending(),
      {
        answer: 'bunpro-tts',
        details: 'jpod101',
        answerPlayUrl: null,
        detailsPlayUrl: 'blob:jpod',
        rewriteFrom: [],
        recordingUrl: 'blob:jpod',
        lookupDone: true,
      },
    ]);
  });

  it('uses the recording for both controls when the example on screen has no audio', async () => {
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);
    vi.mocked(findReplacement).mockResolvedValue(JPOD_HIT);

    const origins = await collectOrigins((onOrigins) => loadTermAudio(TERM, onOrigins));

    expect(origins).toEqual([
      pending(),
      {
        answer: 'jpod101',
        details: 'jpod101',
        answerPlayUrl: 'blob:jpod',
        detailsPlayUrl: 'blob:jpod',
        rewriteFrom: [TERM_TTS],
        recordingUrl: 'blob:jpod',
        lookupDone: true,
      },
    ]);
  });

  it('uses the recording for both when ignoreExampleAudio is set', async () => {
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);
    vi.mocked(exampleOnScreenHasAudio).mockReturnValue(true);
    vi.mocked(findReplacement).mockResolvedValue(JPOD_HIT);

    const origins = await collectOrigins((onOrigins) =>
      loadTermAudio(TERM, onOrigins, { ignoreExampleAudio: true }),
    );

    expect(origins).toEqual([
      pending(),
      {
        answer: 'jpod101',
        details: 'jpod101',
        answerPlayUrl: 'blob:jpod',
        detailsPlayUrl: 'blob:jpod',
        rewriteFrom: [TERM_TTS],
        recordingUrl: 'blob:jpod',
        lookupDone: true,
      },
    ]);
  });

  it('does not look up a speaker when real speakers are off', async () => {
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);

    const origins = await collectOrigins((onOrigins) =>
      loadTermAudio(TERM, onOrigins, { useRealSpeakers: false }),
    );

    expect(findReplacement).not.toHaveBeenCalled();
    expect(origins.at(-1)).toMatchObject({
      answer: 'bunpro-tts',
      details: 'bunpro-tts',
      answerPlayUrl: TERM_TTS,
      recordingUrl: null,
      rewriteFrom: [],
      lookupDone: true,
    });
  });

  it('labels the answer bar as ElevenLabs when the sentence prefetch is that engine', async () => {
    const eleven =
      'https://cdn.example/audio/vocab/elevenlabs/1/study_questions/文-female-1.mp3';
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);
    vi.mocked(exampleOnScreenHasAudio).mockReturnValue(true);
    vi.mocked(answerBarPrefetchHref).mockReturnValue(eleven);
    vi.mocked(findReplacement).mockResolvedValue(JPOD_HIT);

    const origins = await collectOrigins((onOrigins) => loadTermAudio(TERM, onOrigins));

    expect(origins.at(-1)).toEqual({
      answer: 'bunpro-tts-elevenlabs',
      details: 'jpod101',
      answerPlayUrl: eleven,
      detailsPlayUrl: 'blob:jpod',
      rewriteFrom: [],
      recordingUrl: 'blob:jpod',
      lookupDone: true,
    });
  });
});
