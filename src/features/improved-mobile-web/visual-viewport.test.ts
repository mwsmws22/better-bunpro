// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BB_VV_HEIGHT,
  BB_VV_OFFSET_TOP,
  startVisualViewportSync,
  stopVisualViewportSync,
  visibleShell,
  withoutDeviceHeight,
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

describe('visibleShell', () => {
  it('keeps the emulator shell when the visual viewport already matches the layout', () => {
    expect(visibleShell(500, 500)).toEqual({ height: 500, offsetTop: 0 });
  });

  it('stays above an overlay keyboard when the visual viewport is shorter', () => {
    // Phone: layout viewport stays 800 and the visual viewport is the 500px
    // above the keyboard. The shell is that visible height, at the top.
    expect(visibleShell(800, 500)).toEqual({ height: 500, offsetTop: 0 });
  });

  it('does not shrink the shell when the document is scrolled', () => {
    expect(visibleShell(800, 800)).toEqual({ height: 800, offsetTop: 0 });
  });
});

describe('withoutDeviceHeight', () => {
  it('drops the device-height token that makes the layout viewport taller than the screen', () => {
    expect(withoutDeviceHeight(
      'width=device-width, height=device-height, initial-scale=1, minimum-scale=1',
    )).toBe('width=device-width, initial-scale=1, minimum-scale=1');
  });
});

describe('visualViewport sync', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty(BB_VV_HEIGHT);
    document.documentElement.style.removeProperty(BB_VV_OFFSET_TOP);
    vi.stubGlobal('innerHeight', 800);
  });

  afterEach(() => {
    stopVisualViewportSync();
    document.documentElement.style.removeProperty(BB_VV_HEIGHT);
    document.documentElement.style.removeProperty(BB_VV_OFFSET_TOP);
    vi.unstubAllGlobals();
  });

  it('keeps the visual height when the viewport is already scrolled', () => {
    stubVisualViewport(800, 280);
    startVisualViewportSync();

    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('800px');
    expect(document.documentElement.style.getPropertyValue(BB_VV_OFFSET_TOP)).toBe('');
  });

  it('writes a top-aligned shell when the visual viewport is shorter than the layout', () => {
    stubVisualViewport(500, 40);
    startVisualViewportSync();

    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('500px');
    expect(document.documentElement.style.getPropertyValue(BB_VV_OFFSET_TOP)).toBe('');
  });

  it('writes the visual height unchanged when it already matches the layout viewport', () => {
    vi.stubGlobal('innerHeight', 500);
    stubVisualViewport(500, 0);
    startVisualViewportSync();

    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('500px');
    expect(document.documentElement.style.getPropertyValue(BB_VV_OFFSET_TOP)).toBe('');
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
    expect(document.documentElement.style.getPropertyValue(BB_VV_OFFSET_TOP)).toBe('');
  });

  it('falls back to window.innerHeight when visualViewport is missing', () => {
    vi.stubGlobal('visualViewport', null);
    vi.stubGlobal('innerHeight', 720);
    startVisualViewportSync();

    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('720px');
    expect(document.documentElement.style.getPropertyValue(BB_VV_OFFSET_TOP)).toBe('');
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
