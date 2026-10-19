// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOBILE_WEB_CLASS } from './mobile-gate';
import { BB_VV_HEIGHT } from './visual-viewport';
import { improvedMobileWebFeature } from './feature';

describe('improvedMobileWebFeature', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.style.removeProperty(BB_VV_HEIGHT);
    document.getElementById('bb-styles')?.remove();
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('visualViewport', {
      height: 800,
      offsetTop: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
  });

  afterEach(() => {
    improvedMobileWebFeature.stop();
    document.documentElement.className = '';
    document.documentElement.style.removeProperty(BB_VV_HEIGHT);
    vi.unstubAllGlobals();
  });

  it('marks html and syncs viewport height while running on mobile', () => {
    improvedMobileWebFeature.start();

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(true);
    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('800px');
    const styles = document.getElementById('bb-styles')?.textContent ?? '';
    expect(styles).toContain(`html.${MOBILE_WEB_CLASS}`);
    expect(styles).toContain('bb-vv-height');
  });

  it('clears the mobile marker and viewport vars when stopped', () => {
    improvedMobileWebFeature.start();
    improvedMobileWebFeature.stop();

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(false);
    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('');
  });

  it('does not mark html on a wide desktop viewport', () => {
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0' });

    improvedMobileWebFeature.start();

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(false);
    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('');
  });
});
