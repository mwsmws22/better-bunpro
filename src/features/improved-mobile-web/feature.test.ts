// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { improvedMobileWebFeature } from './feature';
import { MOBILE_WEB_CLASS } from './mobile-gate';
import { PROMPT_SCROLLING_CLASS } from './prompt-scroll';
import { BB_VV_HEIGHT } from './visual-viewport';

describe('improvedMobileWebFeature', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.style.removeProperty(BB_VV_HEIGHT);
    document.getElementById('bb-styles')?.remove();
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('outerHeight', 800);
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('marks html and syncs viewport height while running on mobile', () => {
    improvedMobileWebFeature.start();

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(true);
    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('800px');
    const styles = document.getElementById('bb-styles')?.textContent ?? '';
    expect(styles).toContain(`html.${MOBILE_WEB_CLASS}`);
    expect(styles).toContain('bb-vv-height');
    expect(styles).toContain('justify-content: safe center');
    expect(styles).toContain('touch-action: pan-y');
    expect(styles).toContain(PROMPT_SCROLLING_CLASS);
    expect(styles).toContain(
      'html.bb-mobile-web #js-quiz .bp-quiz-question button::before {\n  bottom: 0.4em !important;\n}',
    );
    expect(styles).toContain(
      [
        'html.bb-mobile-web #js-quiz .bp-quiz-question button:has(> .text-primary-accent)::before,',
        'html.bb-mobile-web #js-quiz .bp-quiz-question button:has(> .text-correct)::before,',
        'html.bb-mobile-web #js-quiz .bp-quiz-question button:has(> .text-incorrect)::before {',
        '  bottom: 0 !important;',
        '}',
      ].join('\n'),
    );
  });

  it('clears the mobile marker and viewport vars when stopped', () => {
    improvedMobileWebFeature.start();
    improvedMobileWebFeature.stop();

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(false);
    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('');
  });

  it('keeps answer focus when Hint is pressed while the keyboard is up', () => {
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('visualViewport', {
      height: 500,
      offsetTop: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const { input, span } = mountHintPress();
    input.focus();

    let focusedDuringClick = false;
    span.parentElement!.addEventListener('click', () => {
      input.blur();
      focusedDuringClick = document.activeElement === input;
    });
    span.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    span.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    span.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(focusedDuringClick).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('keeps answer focus when the simulator frame shrinks for the keyboard', () => {
    vi.stubGlobal('screen', { height: 1440, width: 2560 });
    const { input, span } = mountHintPress();
    vi.stubGlobal('innerHeight', 500);
    vi.stubGlobal('visualViewport', {
      height: 500,
      offsetTop: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    input.focus();

    let focusedDuringClick = false;
    span.parentElement!.addEventListener('click', () => {
      input.blur();
      focusedDuringClick = document.activeElement === input;
    });
    span.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    span.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    span.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(focusedDuringClick).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('keeps answer focus when the simulator frame is already keyboard-short', () => {
    vi.stubGlobal('screen', { height: 1440, width: 2560 });
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 480);
    vi.stubGlobal('visualViewport', {
      height: 480,
      offsetTop: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const { input, span } = mountHintPress();
    input.focus();

    let focusedDuringClick = false;
    span.parentElement!.addEventListener('click', () => {
      input.blur();
      focusedDuringClick = document.activeElement === input;
    });
    span.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    span.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    span.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(focusedDuringClick).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('does not open the keyboard when Hint is pressed while it is hidden', () => {
    vi.stubGlobal('outerHeight', 2000);
    vi.stubGlobal('screen', { height: 1440, width: 2560 });
    const { input, span } = mountHintPress();
    let focusedDuringClick = false;
    span.parentElement!.addEventListener('click', () => {
      input.focus();
      focusedDuringClick = document.activeElement === input;
    });
    span.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    span.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(focusedDuringClick).toBe(false);
    expect(document.activeElement).not.toBe(input);
  });

  it('shows the prompt scrollbar only while that section scrolls', () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div id="js-quiz"><article><section></section></article></div>
    `;
    improvedMobileWebFeature.start();
    const section = document.querySelector('section')!;
    section.dispatchEvent(new Event('scroll'));

    expect(document.documentElement.classList.contains(PROMPT_SCROLLING_CLASS)).toBe(true);
    vi.advanceTimersByTime(700);
    expect(document.documentElement.classList.contains(PROMPT_SCROLLING_CLASS)).toBe(false);
    vi.useRealTimers();
  });

  it('drags the prompt with a mouse the way the simulator drags a finger', () => {
    const section = mountScrollablePrompt();
    improvedMobileWebFeature.start();

    dragPrompt(section, 'mouse', 100, 40);

    expect(section.scrollTop).toBe(60);
  });

  it('leaves a real touch pan to the browser', () => {
    const section = mountScrollablePrompt();
    improvedMobileWebFeature.start();

    dragPrompt(section, 'touch', 100, 40);

    expect(section.scrollTop).toBe(0);
  });

  it('keeps the answer focused when the prompt is dragged with the keyboard up', () => {
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 480);
    vi.stubGlobal('screen', { height: 1440, width: 2560 });
    const section = mountScrollablePrompt();
    const input = document.createElement('input');
    input.id = 'js-manual-input';
    document.body.append(input);
    improvedMobileWebFeature.start();
    input.focus();

    section.addEventListener('mousedown', () => input.blur());
    section.dispatchEvent(pointerAt('pointerdown', 'mouse', 100, 1));
    section.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(input);
    section.dispatchEvent(pointerAt('pointerup', 'mouse', 40, 0));
    expect(document.activeElement).toBe(input);
  });

  it('keeps a focused answer field focused when the prompt is dragged', () => {
    const section = mountScrollablePrompt();
    const input = document.createElement('input');
    input.id = 'js-manual-input';
    document.body.append(input);
    improvedMobileWebFeature.start();
    input.focus();

    section.addEventListener('mousedown', () => input.blur());
    section.dispatchEvent(pointerAt('pointerdown', 'mouse', 100, 1));
    section.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(input);
  });

  it('keeps the answer focused when a prompt tap blurs after pointerup', () => {
    const section = mountScrollablePrompt();
    const input = document.createElement('input');
    input.id = 'js-manual-input';
    document.body.append(input);
    improvedMobileWebFeature.start();
    input.focus();

    section.addEventListener('mousedown', () => input.blur());
    section.dispatchEvent(pointerAt('pointerdown', 'touch', 80, 1));
    section.dispatchEvent(pointerAt('pointerup', 'touch', 80, 0));
    section.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(input);

    section.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    input.blur();
    expect(document.activeElement).not.toBe(input);
  });

  it('does not open the keyboard when the prompt is tapped while it is hidden', () => {
    const section = mountScrollablePrompt();
    const input = document.createElement('input');
    input.id = 'js-manual-input';
    document.body.append(input);
    improvedMobileWebFeature.start();

    section.dispatchEvent(pointerAt('pointerdown', 'touch', 80, 1));
    section.dispatchEvent(pointerAt('pointerup', 'touch', 80, 0));
    section.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.activeElement).not.toBe(input);
  });

  it('does not focus the answer field when dragging with the keyboard hidden', () => {
    const section = mountScrollablePrompt();
    const input = document.createElement('input');
    input.id = 'js-manual-input';
    document.body.append(input);
    improvedMobileWebFeature.start();

    section.dispatchEvent(pointerAt('pointerdown', 'mouse', 100, 1));

    expect(document.activeElement).not.toBe(input);
  });

  it('does not mark html on a wide desktop viewport', () => {
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0' });

    improvedMobileWebFeature.start();

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(false);
    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('');
  });
});

function mountScrollablePrompt(): HTMLElement {
  document.body.innerHTML = `
    <div id="js-quiz"><article><section><p>prompt</p></section></article></div>
  `;
  const section = document.querySelector('section') as HTMLElement;
  let top = 0;
  Object.defineProperty(section, 'scrollHeight', { configurable: true, get: () => 400 });
  Object.defineProperty(section, 'clientHeight', { configurable: true, get: () => 100 });
  Object.defineProperty(section, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = value;
    },
  });
  return section;
}

const DRAG_PAST_START = 20;

function dragPrompt(section: HTMLElement, pointerType: string, fromY: number, toY: number): void {
  const midY = fromY - DRAG_PAST_START;
  section.dispatchEvent(pointerAt('pointerdown', pointerType, fromY, 1));
  section.dispatchEvent(pointerAt('pointermove', pointerType, midY, 1));
  section.dispatchEvent(pointerAt('pointermove', pointerType, toY, 1));
  section.dispatchEvent(pointerAt('pointerup', pointerType, toY, 0));
}

function pointerAt(type: string, pointerType: string, clientY: number, buttons: number): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType,
    button: 0,
    buttons,
    clientY,
  });
}

function mountHintPress(): { input: HTMLInputElement; span: Element } {
  document.body.innerHTML = `
    <input id="js-manual-input" />
    <button title="Toggle the hint level"><span>Hint</span></button>
  `;
  improvedMobileWebFeature.start();
  return {
    input: document.getElementById('js-manual-input') as HTMLInputElement,
    span: document.querySelector('button span')!,
  };
}
