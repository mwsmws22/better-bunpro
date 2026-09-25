// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAnswerBarReplay, syncAnswerBarReplay } from './answer-replay';

afterEach(() => {
  clearAnswerBarReplay();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

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
    expect(button?.closest('.InputManual')).not.toBeNull();
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
    document.body.innerHTML = `
      <div class="InputManual">
        <div class="p-6"><div class="h-18 w-18"></div></div>
      </div>
    `;
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    vi.spyOn(globalThis, 'Audio').mockImplementation(function MockAudio(
      this: {
        play: typeof play;
        pause: typeof pause;
        paused: boolean;
        src: string;
        addEventListener: (type: string, fn: () => void) => void;
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
      return this;
    } as unknown as typeof Audio);

    syncAnswerBarReplay({ enabled: true, playUrl: 'blob:jpod' });
    const button = document.getElementById('bb-answer-bar-replay');
    button?.click();
    expect(Audio).toHaveBeenCalledWith('blob:jpod');
    expect(play).toHaveBeenCalledOnce();
    expect(button?.classList.contains('bb-replay-playing')).toBe(true);

    play.mockClear();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    expect(pause).toHaveBeenCalledOnce();
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
