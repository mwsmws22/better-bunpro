// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BB_VV_HEIGHT,
  BB_VV_OFFSET_TOP,
  startVisualViewportSync,
  stopVisualViewportSync,
} from './visual-viewport';

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
