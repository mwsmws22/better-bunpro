// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resetTermAutoplayState,
  markTermAudioPlayedViaBunpro,
  scheduleTermRecordingAutoplay,
} from './autoplay';

afterEach(() => {
  resetTermAutoplayState();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('scheduleTermRecordingAutoplay', () => {
  it('plays the recording once when Bunpro never starts playback', async () => {
    vi.useFakeTimers();
    const play = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(globalThis, 'Audio').mockImplementation(function MockAudio(this: { play: typeof play; src: string }, src?: string) {
      this.src = src ?? '';
      this.play = play;
      return this;
    } as unknown as typeof Audio);

    scheduleTermRecordingAutoplay('review:1', 'blob:jpod');
    await vi.advanceTimersByTimeAsync(500);

    expect(Audio).toHaveBeenCalledWith('blob:jpod');
    expect(play).toHaveBeenCalledOnce();
  });

  it('does not play when Bunpro already played (via our swap) for this review', async () => {
    vi.useFakeTimers();
    const play = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(globalThis, 'Audio').mockImplementation(function MockAudio(this: { play: typeof play }) {
      this.play = play;
      return this;
    } as unknown as typeof Audio);

    scheduleTermRecordingAutoplay('review:1', 'blob:jpod');
    markTermAudioPlayedViaBunpro();
    await vi.advanceTimersByTimeAsync(500);

    expect(play).not.toHaveBeenCalled();
  });

  it('does not play when the skip gate says example sentence audio is on screen', async () => {
    vi.useFakeTimers();
    const play = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(globalThis, 'Audio').mockImplementation(function MockAudio(this: { play: typeof play }) {
      this.play = play;
      return this;
    } as unknown as typeof Audio);

    const { setTermAutoplaySkipWhen } = await import('./autoplay');
    setTermAutoplaySkipWhen(() => true);
    scheduleTermRecordingAutoplay('review:1', 'blob:jpod');
    await vi.advanceTimersByTimeAsync(500);

    expect(play).not.toHaveBeenCalled();
    setTermAutoplaySkipWhen(null);
  });

  it('plays only once per review key', async () => {
    vi.useFakeTimers();
    const play = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(globalThis, 'Audio').mockImplementation(function MockAudio(this: { play: typeof play }) {
      this.play = play;
      return this;
    } as unknown as typeof Audio);

    scheduleTermRecordingAutoplay('review:1', 'blob:jpod');
    scheduleTermRecordingAutoplay('review:1', 'blob:jpod');
    await vi.advanceTimersByTimeAsync(500);

    expect(play).toHaveBeenCalledOnce();
  });
});
