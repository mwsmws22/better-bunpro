// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BB_VV_HEIGHT,
  BB_VV_OFFSET_TOP,
  startVisualViewportSync,
  stopVisualViewportSync,
} from './visual-viewport';
import { GESTURE_NAV_BAR_PX } from './fullscreen-keyboard';

type VvStub = {
  height: number;
  offsetTop: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

function stubVisualViewport(height: number, offsetTop = 0): VvStub {
  const vv: VvStub = {
    height,
    offsetTop,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('visualViewport', vv);
  return vv;
}

describe('visualViewport sync', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty(BB_VV_HEIGHT);
    document.documentElement.style.removeProperty(BB_VV_OFFSET_TOP);
  });

  afterEach(() => {
    stopVisualViewportSync();
    document.documentElement.style.removeProperty(BB_VV_HEIGHT);
    document.documentElement.style.removeProperty(BB_VV_OFFSET_TOP);
    vi.unstubAllGlobals();
  });

  it('writes height and offset CSS vars from visualViewport', () => {
    stubVisualViewport(500, 12);
    startVisualViewportSync();

    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('500px');
    expect(document.documentElement.style.getPropertyValue(BB_VV_OFFSET_TOP)).toBe('12px');
  });

  it('listens for resize and scroll on visualViewport', () => {
    const vv = stubVisualViewport(600);
    startVisualViewportSync();

    expect(vv.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(vv.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('updates vars when the resize listener fires', () => {
    const vv = stubVisualViewport(600);
    startVisualViewportSync();

    const resizeHandler = vv.addEventListener.mock.calls.find(
      (call) => call[0] === 'resize',
    )?.[1] as () => void;
    vv.height = 320;
    vv.offsetTop = 40;
    resizeHandler();

    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('320px');
    expect(document.documentElement.style.getPropertyValue(BB_VV_OFFSET_TOP)).toBe('40px');
  });

  it('falls back to window.innerHeight when visualViewport is missing', () => {
    vi.stubGlobal('visualViewport', null);
    vi.stubGlobal('innerHeight', 720);
    startVisualViewportSync();

    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('720px');
    expect(document.documentElement.style.getPropertyValue(BB_VV_OFFSET_TOP)).toBe('0px');
  });

  describe('keyboard in the fullscreen app on a phone', () => {
    const SCREEN_HEIGHT = 920;
    const FIREFOX_KEYBOARD_VIEWPORT = 595.7;

    function stubPhone(fullscreen: boolean): void {
      vi.stubGlobal('screen', { height: SCREEN_HEIGHT, width: 414 });
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: fullscreen && query === '(display-mode: fullscreen)',
      }));
    }

    function resize(vv: VvStub, height: number): void {
      const handler = vv.addEventListener.mock.calls.find(
        (call) => call[0] === 'resize',
      )?.[1] as () => void;
      vv.height = height;
      handler();
    }

    function publishedHeight(): string {
      return document.documentElement.style.getPropertyValue(BB_VV_HEIGHT);
    }

    it('keeps the navigation bar strip Firefox leaves behind the keyboard out of the height', () => {
      stubPhone(true);
      const vv = stubVisualViewport(SCREEN_HEIGHT);
      startVisualViewportSync();

      resize(vv, FIREFOX_KEYBOARD_VIEWPORT);

      expect(publishedHeight()).toBe(`${FIREFOX_KEYBOARD_VIEWPORT - GESTURE_NAV_BAR_PX}px`);
    });

    it('publishes the full screen again once the keyboard closes', () => {
      stubPhone(true);
      const vv = stubVisualViewport(SCREEN_HEIGHT);
      startVisualViewportSync();

      resize(vv, FIREFOX_KEYBOARD_VIEWPORT);
      resize(vv, SCREEN_HEIGHT);

      expect(publishedHeight()).toBe(`${SCREEN_HEIGHT}px`);
    });

    it('trusts the viewport while the status bar is showing', () => {
      stubPhone(true);
      const vv = stubVisualViewport(871);
      startVisualViewportSync();

      resize(vv, 522.5);

      expect(publishedHeight()).toBe('522.5px');
    });

    it('trusts the viewport outside the fullscreen app', () => {
      stubPhone(false);
      const vv = stubVisualViewport(SCREEN_HEIGHT);
      startVisualViewportSync();

      resize(vv, FIREFOX_KEYBOARD_VIEWPORT);

      expect(publishedHeight()).toBe(`${FIREFOX_KEYBOARD_VIEWPORT}px`);
    });

    it('trusts the viewport when the keyboard was already up at start', () => {
      stubPhone(true);
      stubVisualViewport(FIREFOX_KEYBOARD_VIEWPORT);
      startVisualViewportSync();

      expect(publishedHeight()).toBe(`${FIREFOX_KEYBOARD_VIEWPORT}px`);
    });
  });

  it('clears vars and removes listeners on stop', () => {
    const vv = stubVisualViewport(500, 8);
    startVisualViewportSync();
    stopVisualViewportSync();

    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('');
    expect(document.documentElement.style.getPropertyValue(BB_VV_OFFSET_TOP)).toBe('');
    expect(vv.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(vv.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
