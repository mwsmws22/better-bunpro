// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearAnswerBarReplay,
  playAnswerBarRecording,
  syncAnswerBarReplay,
} from './answer-replay';

afterEach(async () => {
  clearAnswerBarReplay();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  const { forgetAll } = await import('./store');
  forgetAll();
});

function mockAudioPlay(): ReturnType<typeof vi.fn> {
  const play = vi.fn().mockResolvedValue(undefined);
  const pause = vi.fn();
  vi.spyOn(globalThis, 'Audio').mockImplementation(function MockAudio(
    this: {
      play: typeof play;
      pause: typeof pause;
      paused: boolean;
      src: string;
      addEventListener: (type: string, fn: () => void) => void;
      removeEventListener: (type: string, fn: () => void) => void;
    },
    src?: string,
  ) {
    this.src = src ?? '';
    this.paused = true;
    this.play = () => {
      this.paused = false;
      return play();
    };
    this.pause = () => {
      this.paused = true;
      pause();
    };
    this.addEventListener = () => undefined;
    this.removeEventListener = () => undefined;
    return this;
  } as unknown as typeof Audio);
  return play;
}

function mockMedia(src = ''): HTMLMediaElement {
  return {
    paused: false,
    src,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    pause: () => undefined,
  } as unknown as HTMLMediaElement;
}

function emptyAnswerBar(): void {
  document.body.innerHTML = `
    <div class="InputManual">
      <div class="p-6"><div class="h-18 w-18 md:h-24 md:w-24"></div></div>
      <form class="InputManual__form"></form>
    </div>
  `;
}

describe('syncAnswerBarReplay', () => {
  it('injects a play button into Bunpro’s empty answer-bar slot when audio is unavailable', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <div class="p-6"><div class="h-18 w-18 md:h-24 md:w-24"></div></div>
        <form class="InputManual__form"></form>
      </div>
    `;

    syncAnswerBarReplay({ enabled: true, playUrl: 'blob:jpod' });

    const button = document.getElementById('bb-answer-bar-replay');
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button?.parentElement?.classList.contains('InputManual')).toBe(true);
    expect(button?.parentElement?.querySelector(':scope > div.p-6')).not.toBeNull();
    expect(button?.closest('div.p-6')).toBeNull();
  });

  it('does not inject when disabled or waiting for a play URL', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <div class="p-6"><div class="h-18 w-18"></div></div>
      </div>
    `;

    syncAnswerBarReplay({ enabled: false, playUrl: 'blob:jpod' });
    expect(document.getElementById('bb-answer-bar-replay')).toBeNull();

    syncAnswerBarReplay({ enabled: true, playUrl: null });
    expect(document.getElementById('bb-answer-bar-replay')).toBeNull();
  });

  it('still injects when Bunpro has its own play control (we replace that chrome)', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <div class="p-6"><div class="h-18 w-18"></div></div>
        <button title="Play">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
        <form></form>
      </div>
    `;

    syncAnswerBarReplay({ enabled: true, playUrl: 'blob:jpod' });

    expect(document.getElementById('bb-answer-bar-replay')).toBeInstanceOf(HTMLButtonElement);
  });

  it('plays the recording on click and on P', () => {
    emptyAnswerBar();
    const play = mockAudioPlay();

    syncAnswerBarReplay({ enabled: true, playUrl: 'blob:jpod' });
    const button = document.getElementById('bb-answer-bar-replay');
    button?.click();
    expect(Audio).toHaveBeenCalledWith('blob:jpod');
    expect(play).toHaveBeenCalledOnce();
    expect(button?.classList.contains('bb-replay-playing')).toBe(true);

    play.mockClear();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    expect(button?.classList.contains('bb-replay-playing')).toBe(false);
  });

  it('does not clear→reinject when synced again (avoids remount loops)', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <div class="p-6"><div class="h-18 w-18"></div></div>
      </div>
    `;

    syncAnswerBarReplay({ enabled: true, playUrl: 'blob:jpod' });
    const first = document.getElementById('bb-answer-bar-replay');
    syncAnswerBarReplay({ enabled: true, playUrl: 'blob:jpod-2' });
    const second = document.getElementById('bb-answer-bar-replay');

    expect(second).toBe(first);
    expect(second?.dataset.bbPlayUrl).toBe('blob:jpod-2');
  });

  it('does not tear down an existing button while the play URL is still loading', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <div class="p-6"><div class="h-18 w-18"></div></div>
      </div>
    `;

    syncAnswerBarReplay({ enabled: true, playUrl: 'blob:jpod' });
    const first = document.getElementById('bb-answer-bar-replay');
    syncAnswerBarReplay({ enabled: true, playUrl: null });

    expect(document.getElementById('bb-answer-bar-replay')).toBe(first);
  });
});

describe('playAnswerBarRecording', () => {
  it('shows the playing (pause) state when autoplay starts before sync', () => {
    emptyAnswerBar();
    mockAudioPlay();

    // Fallback autoplay can fire as soon as the clip is ready — before paintCues
    // has synced the toggle into the empty answer-bar slot.
    playAnswerBarRecording('blob:jpod');

    const button = document.getElementById('bb-answer-bar-replay');
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button?.classList.contains('bb-replay-playing')).toBe(true);
  });

  it('keeps the playing state if sync re-runs while audio is playing', () => {
    emptyAnswerBar();
    mockAudioPlay();

    syncAnswerBarReplay({ enabled: true, playUrl: 'blob:jpod' });
    playAnswerBarRecording('blob:jpod');
    syncAnswerBarReplay({ enabled: true, playUrl: 'blob:jpod' });

    const button = document.getElementById('bb-answer-bar-replay');
    expect(button?.classList.contains('bb-replay-playing')).toBe(true);
  });
});

describe('takeOverBunproAnswerPlay', () => {
  it('takes over Bunpro correct-answer autoplay via prefetch before paint syncs', async () => {
    const { takeOverBunproAnswerPlay } = await import('./answer-replay');
    document.body.innerHTML = `
      <link id="prefetch-audio" rel="prefetch" as="audio"
        href="https://cdn.example/audio/grammar/sentence.mp3" />
      <div class="InputManual">
        <div class="p-6"><div class="h-18 w-18"></div></div>
        <form class="InputManual__form"></form>
      </div>
    `;
    const media = mockMedia();

    // Bunpro autoplays in the same tick as post-attempt — before human-term-audio
    // has called syncAnswerBarReplay / set playUrl.
    expect(
      takeOverBunproAnswerPlay(
        media,
        'https://cdn.example/audio/grammar/sentence.mp3',
        null,
      ),
    ).toBe(true);

    const button = document.getElementById('bb-answer-bar-replay');
    expect(button?.classList.contains('bb-replay-playing')).toBe(true);
  });

  it('takes over Bunpro prefetch TTS autoplay when the answer bar is already on JPod', async () => {
    const { syncAnswerBarReplay, takeOverBunproAnswerPlay } = await import('./answer-replay');
    document.body.innerHTML = `
      <link id="prefetch-audio" rel="prefetch" as="audio"
        href="https://cdn.example/audio/vocab/pronunciation/習わし-male.mp3" />
      <div class="InputManual">
        <div class="p-6"><div class="h-18 w-18"></div></div>
        <form class="InputManual__form"></form>
      </div>
    `;
    mockAudioPlay();
    syncAnswerBarReplay({ enabled: true, playUrl: 'blob:jpod' });
    const media = mockMedia(
      'https://cdn.example/audio/vocab/pronunciation/習わし-male.mp3',
    );

    // Bunpro calls play() with the prefetch TTS URL; playUrl is already the JPod
    // blob. Takeover adopts Bunpro’s element (gesture-safe) and shows pause.
    expect(
      takeOverBunproAnswerPlay(
        media,
        'https://cdn.example/audio/vocab/pronunciation/習わし-male.mp3',
        null,
      ),
    ).toBe(true);

    const button = document.getElementById('bb-answer-bar-replay');
    expect(button?.classList.contains('bb-replay-playing')).toBe(true);
    expect(media.src).toBe('blob:jpod');
  });

  it('takes over when Bunpro’s src is already the JPod blob before playUrl syncs', async () => {
    const { remember } = await import('./store');
    const { takeOverBunproAnswerPlay } = await import('./answer-replay');
    const tts = 'https://cdn.example/audio/vocab/pronunciation/習わし-male.mp3';
    document.body.innerHTML = `
      <link id="prefetch-audio" rel="prefetch" as="audio" href="${tts}" />
      <div class="InputManual">
        <div class="p-6"><div class="h-18 w-18"></div></div>
        <form class="InputManual__form"></form>
      </div>
    `;
    remember([tts], 'blob:jpod', 'jpod101');
    const media = mockMedia('blob:jpod');

    expect(takeOverBunproAnswerPlay(media, 'blob:jpod', 'blob:jpod')).toBe(true);
    expect(
      document.getElementById('bb-answer-bar-replay')?.classList.contains('bb-replay-playing'),
    ).toBe(true);
  });
});
