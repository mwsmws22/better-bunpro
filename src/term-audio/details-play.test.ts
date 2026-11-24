// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startDetailsPlay, stopDetailsPlay } from './details-play';

afterEach(() => {
  stopDetailsPlay();
  document.body.innerHTML = '';
});

describe('details play', () => {
  it('plays the stamped term recording and does not let the page handle the click', () => {
    const play = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(globalThis, 'Audio').mockImplementation(function MockAudio(this: {
      play: () => Promise<void>;
      pause: () => void;
    }) {
      this.play = () => play();
      this.pause = () => undefined;
      return this as unknown as HTMLAudioElement;
    } as unknown as typeof Audio);
    document.body.innerHTML = `
      <div class="DetailsPitchAccent">
        <button data-bb-own-play="true" data-bb-resolved-url="blob:term">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;
    startDetailsPlay();

    const button = document.querySelector('button');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    button?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(Audio).toHaveBeenCalledWith('blob:term');
    expect(play).toHaveBeenCalledOnce();
  });

  it('leaves a details click alone when this card is not owning that button', () => {
    vi.spyOn(globalThis, 'Audio').mockImplementation(() => ({}) as HTMLAudioElement);
    document.body.innerHTML = `
      <div class="DetailsPitchAccent">
        <button data-bb-resolved-url="blob:term">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;
    startDetailsPlay();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('button')?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(Audio).not.toHaveBeenCalled();
  });
});
