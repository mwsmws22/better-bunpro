// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$', () => ({
  GM_getValue: undefined,
  GM_setValue: undefined,
}));

import { startAudioDownloads, stopAudioDownloads } from './download';

afterEach(() => {
  stopAudioDownloads();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('review right-click download', () => {
  it('saves the clip when the click lands beside a disabled play button', async () => {
    document.body.innerHTML = `
      <div id="bar">
        <button disabled title="Bunpro Classic TTS" data-bb-resolved-url="https://cdn.example/clip.mp3">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;
    const button = document.querySelector('button');
    const svg = button?.querySelector('svg');
    if (!button || !svg) {
      throw new Error('missing play button');
    }
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [svg, button],
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => new Blob(),
    } as Response);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: () => 'blob:clip',
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: () => {},
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    startAudioDownloads();
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 18,
      clientY: 18,
    });
    document.getElementById('bar')?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(click).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith('https://cdn.example/clip.mp3');
  });
});
