import { describe, expect, it } from 'vitest';
import {
  bunproClipOrigin,
  bunproOrigin,
  isRealAudioOrigin,
  labelForOrigin,
  originFromSourceName,
} from './origin';

describe('labelForOrigin', () => {
  it('names recordings and each Bunpro TTS engine on the play-button tooltip', () => {
    expect(labelForOrigin('jpod101')).toBe('JPod101 Recording');
    expect(labelForOrigin('jisho')).toBe('Jisho Recording');
    expect(labelForOrigin('bunpro-tts')).toBe('Bunpro Classic TTS');
    expect(labelForOrigin('bunpro-tts-gemini')).toBe('Bunpro Gemini TTS');
    expect(labelForOrigin('bunpro-tts-elevenlabs')).toBe('Bunpro ElevenLabs TTS');
    expect(labelForOrigin('bunpro-rec')).toBe('Bunpro Recording');
  });
});

describe('isRealAudioOrigin', () => {
  it('treats dictionary and Bunpro recordings as real; all Bunpro TTS engines as not', () => {
    expect(isRealAudioOrigin('jpod101')).toBe(true);
    expect(isRealAudioOrigin('jisho')).toBe(true);
    expect(isRealAudioOrigin('bunpro-rec')).toBe(true);
    expect(isRealAudioOrigin('bunpro-tts')).toBe(false);
    expect(isRealAudioOrigin('bunpro-tts-gemini')).toBe(false);
    expect(isRealAudioOrigin('bunpro-tts-elevenlabs')).toBe(false);
  });
});

describe('originFromSourceName', () => {
  it('collapses both JapanesePod101 sources and recognises Jisho', () => {
    expect(originFromSourceName('JapanesePod101')).toBe('jpod101');
    expect(originFromSourceName('JapanesePod101 dictionary')).toBe('jpod101');
    expect(originFromSourceName('Jisho')).toBe('jisho');
  });
});

describe('bunproOrigin', () => {
  it('distinguishes synthesised clips from Bunpro\'s own recordings', () => {
    expect(bunproOrigin(true)).toBe('bunpro-tts');
    expect(bunproOrigin(false)).toBe('bunpro-rec');
  });
});

describe('bunproClipOrigin', () => {
  it('maps classic /tts/, /gemini/, and /elevenlabs/ URLs to distinct Bunpro TTS origins', () => {
    expect(
      bunproClipOrigin(
        'https://cdn.example/audio/vocab/tts/この樽にはお酒が入っています。-male.mp3',
      ),
    ).toBe('bunpro-tts');
    expect(
      bunproClipOrigin(
        'https://cdn.example/audio/vocab/gemini/7676/study_questions/フユニナルトポンポンツキノグッズガホシクナル-male.mp3',
      ),
    ).toBe('bunpro-tts-gemini');
    expect(
      bunproClipOrigin(
        'https://cdn.example/audio/vocab/elevenlabs/11660/study_questions/積乱雲が巻き起こっています-male-1791521767311.mp3',
      ),
    ).toBe('bunpro-tts-elevenlabs');
    expect(
      bunproClipOrigin('https://cdn.example/audio/vocab/pronunciation/樽-male.mp3'),
    ).toBe('bunpro-rec');
    expect(
      bunproClipOrigin(
        'https://cdn.example/audio/grammar/n1/子供ですら知っている.mp3',
      ),
    ).toBe('bunpro-rec');
    expect(bunproClipOrigin(null)).toBeNull();
  });
});
