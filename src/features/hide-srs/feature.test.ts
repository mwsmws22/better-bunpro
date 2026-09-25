// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hideSrsFeature, HIDE_SRS_CLASS } from './feature';

describe('hideSrsFeature', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.getElementById('bb-styles')?.remove();
    document.body.innerHTML = `
      <ul>
        <li title="Your SRS progress"><p>Seasoned 2</p></li>
        <li title="Correct question attempts">0/0</li>
      </ul>
    `;
  });

  afterEach(() => {
    hideSrsFeature.stop();
    document.documentElement.className = '';
  });

  it('hides Bunpro’s SRS progress chip while the feature is running', () => {
    hideSrsFeature.start();

    expect(document.documentElement.classList.contains(HIDE_SRS_CLASS)).toBe(true);
    const styles = document.getElementById('bb-styles')?.textContent ?? '';
    expect(styles).toContain(`html.${HIDE_SRS_CLASS}`);
    expect(styles).toContain('li[title="Your SRS progress"]');
  });

  it('removes the hide marker when stopped', () => {
    hideSrsFeature.start();
    hideSrsFeature.stop();

    expect(document.documentElement.classList.contains(HIDE_SRS_CLASS)).toBe(false);
  });

  it('leaves the other quiz header stats alone in the stylesheet selector', () => {
    hideSrsFeature.start();
    const styles = document.getElementById('bb-styles')?.textContent ?? '';
    expect(styles).not.toContain('Correct question attempts');
  });
});
