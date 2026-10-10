// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { clearAudioSourceIndicator, syncAudioSourceIndicator } from './indicator';

afterEach(() => {
  clearAudioSourceIndicator();
  document.body.innerHTML = '';
});

describe('syncAudioSourceIndicator', () => {
  it('sets the play-button tooltip and does not insert an inline chip', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <button title="Open the audio player and play audio">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
        <form></form>
      </div>
    `;

    syncAudioSourceIndicator({ answerOrigin: 'jpod101', afterSubmit: true });

    const play = document.querySelector('.InputManual button');
    expect(document.getElementById('bb-audio-source')).toBeNull();
    expect(play?.getAttribute('title')).toBe('JPod101 Recording');
    expect(play?.classList.contains('bb-audio-real')).toBe(true);
  });

  it('does not accent the play button for Bunpro TTS or before submit', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <button title="Open the audio player and play audio">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;

    syncAudioSourceIndicator({ answerOrigin: 'bunpro-tts', afterSubmit: true });
    expect(document.querySelector('.InputManual button')?.classList.contains('bb-audio-real')).toBe(
      false,
    );
    expect(document.querySelector('.InputManual button')?.classList.contains('bb-audio-tts')).toBe(
      true,
    );

    syncAudioSourceIndicator({ answerOrigin: 'jisho', afterSubmit: false });
    expect(document.querySelector('.InputManual button')?.classList.contains('bb-audio-real')).toBe(
      false,
    );
  });

  it('restores the play title when cleared', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <button title="Open the audio player and play audio">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;
    syncAudioSourceIndicator({ answerOrigin: 'bunpro-rec', afterSubmit: true });
    clearAudioSourceIndicator();

    const play = document.querySelector('.InputManual button');
    expect(play?.getAttribute('title')).toBe('Open the audio player and play audio');
    expect(play?.classList.contains('bb-audio-real')).toBe(false);
  });

  it('can show Bunpro TTS on the answer bar and a real recording on Details', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <button title="Open the audio player and play audio">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
      <div class="DetailsPitchAccent">
        <button class="text-primary-accent">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;

    syncAudioSourceIndicator({
      afterSubmit: true,
      answerOrigin: 'bunpro-tts',
      detailsOrigin: 'jpod101',
    });

    const answer = document.querySelector('.InputManual button');
    const details = document.querySelector('.DetailsPitchAccent button');
    expect(answer?.getAttribute('title')).toBe('Bunpro Classic TTS');
    expect(answer?.classList.contains('bb-audio-tts')).toBe(true);
    expect(answer?.classList.contains('bb-audio-real')).toBe(false);
    expect(details?.getAttribute('title')).toBe('JPod101 Recording');
    expect(details?.classList.contains('bb-audio-real')).toBe(true);
  });

  it('accents the Details pitch-accent play button on a vocabulary page', () => {
    document.body.innerHTML = `
      <div class="DetailsPitchAccent">
        <button class="text-primary-accent">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;

    syncAudioSourceIndicator({ detailsOrigin: 'jpod101', afterSubmit: true });

    const play = document.querySelector('.DetailsPitchAccent button');
    expect(play?.getAttribute('title')).toBe('JPod101 Recording');
    expect(play?.classList.contains('bb-audio-real')).toBe(true);
    expect(play?.classList.contains('bb-audio-tts')).toBe(false);
  });

  it('forces the Details play button off Bunpro accent when only TTS will play', () => {
    document.body.innerHTML = `
      <div class="DetailsPitchAccent">
        <button class="text-primary-accent">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;

    syncAudioSourceIndicator({ detailsOrigin: 'bunpro-tts', afterSubmit: true });

    const play = document.querySelector('.DetailsPitchAccent button');
    expect(play?.getAttribute('title')).toBe('Bunpro Classic TTS');
    expect(play?.classList.contains('bb-audio-tts')).toBe(true);
    expect(play?.classList.contains('bb-audio-real')).toBe(false);
  });

  it('paints Examples speakers as TTS immediately while origins are still loading', () => {
    document.body.innerHTML = `
      <article class="bp-reviewable-root">
        <li id="study-question-10">
          <button id="pending" class="text-primary-accent" title="Play audio"></button>
        </li>
      </article>
    `;

    syncAudioSourceIndicator({ afterSubmit: true, exampleOrigins: null });

    const pending = document.getElementById('pending');
    expect(pending?.classList.contains('bb-audio-tts')).toBe(true);
    expect(pending?.classList.contains('bb-audio-real')).toBe(false);
    // Keep Bunpro’s title until the real origin (classic / Gemini / …) is known.
    expect(pending?.getAttribute('title')).toBe('Play audio');
  });

  it('tints Info Examples speakers from each study-question origin', () => {
    document.body.innerHTML = `
      <article class="bp-reviewable-root">
        <li id="study-question-10">
          <button id="tts" class="text-primary-accent" title="Play audio"></button>
        </li>
        <li id="study-question-11">
          <button id="rec" class="text-primary-accent" title="Play audio"></button>
        </li>
        <li id="study-question-12">
          <button id="gemini" class="text-primary-accent" title="Play audio"></button>
        </li>
        <li id="study-question-13">
          <button id="eleven" class="text-primary-accent" title="Play audio"></button>
        </li>
      </article>
    `;

    syncAudioSourceIndicator({
      afterSubmit: true,
      exampleOrigins: new Map([
        [10, 'bunpro-tts'],
        [11, 'bunpro-rec'],
        [12, 'bunpro-tts-gemini'],
        [13, 'bunpro-tts-elevenlabs'],
      ]),
    });

    const tts = document.getElementById('tts');
    const rec = document.getElementById('rec');
    const gemini = document.getElementById('gemini');
    const eleven = document.getElementById('eleven');
    expect(tts?.getAttribute('title')).toBe('Bunpro Classic TTS');
    expect(tts?.classList.contains('bb-audio-tts')).toBe(true);
    expect(tts?.classList.contains('bb-audio-real')).toBe(false);
    expect(rec?.getAttribute('title')).toBe('Bunpro Recording');
    expect(rec?.classList.contains('bb-audio-real')).toBe(true);
    expect(rec?.classList.contains('bb-audio-tts')).toBe(false);
    expect(gemini?.getAttribute('title')).toBe('Bunpro Gemini TTS');
    expect(gemini?.classList.contains('bb-audio-tts')).toBe(true);
    expect(gemini?.classList.contains('bb-audio-real')).toBe(false);
    expect(eleven?.getAttribute('title')).toBe('Bunpro ElevenLabs TTS');
    expect(eleven?.classList.contains('bb-audio-tts')).toBe(true);
    expect(eleven?.classList.contains('bb-audio-real')).toBe(false);
  });

  it('does not keep mutating when a body observer re-syncs after its own write', async () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <button title="Open the audio player and play audio">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
        <form></form>
      </div>
    `;

    let deliveries = 0;
    const observer = new MutationObserver(() => {
      deliveries += 1;
      if (deliveries > 40) {
        observer.disconnect();
        return;
      }
      syncAudioSourceIndicator({ answerOrigin: 'jpod101', afterSubmit: true });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    syncAudioSourceIndicator({ answerOrigin: 'jpod101', afterSubmit: true });
    for (let i = 0; i < 10; i += 1) {
      await Promise.resolve();
    }
    observer.disconnect();

    expect(deliveries).toBeLessThan(5);
  });
});
