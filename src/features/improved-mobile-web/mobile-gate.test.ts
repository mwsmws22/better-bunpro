// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isMobileContext,
  MOBILE_WEB_CLASS,
  MOBILE_WIDTH_MAX_PX,
  startMobileGate,
  stopMobileGate,
} from './mobile-gate';

describe('isMobileContext', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is true when viewport width is at the Bunpro sm breakpoint', () => {
    vi.stubGlobal('innerWidth', MOBILE_WIDTH_MAX_PX);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0' });

    expect(isMobileContext()).toBe(true);
  });

  it('is false when viewport is wider than sm and UA is desktop', () => {
    vi.stubGlobal('innerWidth', MOBILE_WIDTH_MAX_PX + 1);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0' });

    expect(isMobileContext()).toBe(false);
  });

  it('is true for a mobile UA even when the viewport is wide', () => {
    vi.stubGlobal('innerWidth', 1024);
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });

    expect(isMobileContext()).toBe(true);
  });
});

describe('startMobileGate / stopMobileGate', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
  });

  afterEach(() => {
    stopMobileGate();
    document.documentElement.className = '';
    vi.unstubAllGlobals();
  });

  it('adds html.bb-mobile-web when mobile and calls onChange(true)', () => {
    const onChange = vi.fn();
    startMobileGate(onChange);

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not add the class when not mobile, and calls onChange(false)', () => {
    vi.stubGlobal('innerWidth', 1024);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0' });
    const onChange = vi.fn();
    startMobileGate(onChange);

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(false);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('removes the class and calls onChange(false) on stop', () => {
    const onChange = vi.fn();
    startMobileGate(onChange);
    onChange.mockClear();

    stopMobileGate();

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(false);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('re-evaluates on window resize', () => {
    vi.stubGlobal('innerWidth', 1024);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0' });
    const onChange = vi.fn();
    startMobileGate(onChange);
    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(false);

    vi.stubGlobal('innerWidth', 390);
    window.dispatchEvent(new Event('resize'));

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
